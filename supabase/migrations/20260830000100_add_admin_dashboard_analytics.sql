-- Server-side aggregation for the admin dashboard (`/admin/dashboard`) — real Postgres functions,
-- not "fetch every row and reduce in JS" (the old `adminService.getDashboardStats` did that for
-- revenue: `select("total_amount").eq("payment_status","paid")` then a JS `.reduce`, one full
-- table scan of every paid order pulled over the wire on every dashboard load).
--
-- All four functions are SECURITY DEFINER with an explicit `is_staff()` guard at the top, rather
-- than relying on each underlying table's own RLS to add up to the right access. That matters
-- concretely for `admin_dashboard_stats()`'s customer count: `profiles` only grants SELECT to
-- `is_admin()` (see `20260828000200_create_profiles.sql`), not `is_staff()` — under plain RLS a
-- manager's own session would see zero/one row there, even though "how many customers do we
-- have" is a staff-visible headline number on a page `requireStaff()` (not `requireAdmin()`)
-- gates, not a grant of individual-profile browsing (that stays `/admin/customers`,
-- `requireAdmin()`-only). Bypassing RLS here is deliberately narrow — a handful of aggregate
-- counts/sums, never a row of underlying data — and gated by the same `is_staff()` check the
-- application layer enforces, the same reasoning `is_admin()`/`is_staff()` themselves already
-- rely on to read `profiles` without recursing into their own policy.

create or replace function public.admin_dashboard_stats()
returns table (
  total_revenue numeric,
  total_orders bigint,
  pending_orders bigint,
  processing_orders bigint,
  completed_orders bigint,
  cancelled_orders bigint,
  active_subscriptions bigint,
  expiring_soon_subscriptions bigint,
  total_customers bigint,
  pending_payments bigint,
  pending_reviews bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  return query
  select
    coalesce((select sum(o.total_amount) from public.orders o where o.payment_status = 'paid'), 0),
    (select count(*) from public.orders),
    (select count(*) from public.orders o where o.status = 'pending'),
    (select count(*) from public.orders o where o.status = 'processing'),
    (select count(*) from public.orders o where o.status = 'completed'),
    (select count(*) from public.orders o where o.status = 'cancelled'),
    (select count(*) from public.subscriptions s where s.status = 'active'),
    (select count(*) from public.subscriptions s where s.status = 'expiring_soon'),
    (select count(*) from public.profiles p where p.role = 'customer'),
    (select count(*) from public.payments pay where pay.status = 'pending'),
    (select count(*) from public.reviews r where r.status = 'pending');
end;
$$;

-- Zero-filled daily revenue series (paid orders only) for the trailing `p_days` days — backs the
-- 7-day/30-day/90-day "Revenue analytics" ranges. Zero-filling (the `days` CTE left-joined
-- against actual revenue) means the chart never silently drops a day with no revenue.
create or replace function public.admin_revenue_daily(p_days integer)
returns table (day date, revenue numeric)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  p_days := least(greatest(p_days, 1), 366);

  return query
  with days as (
    select generate_series(
      (current_date - (p_days - 1) * interval '1 day')::date,
      current_date,
      interval '1 day'
    )::date as day
  ),
  paid as (
    select o.created_at::date as day, sum(o.total_amount) as revenue
    from public.orders o
    where o.payment_status = 'paid'
      and o.created_at >= (current_date - (p_days - 1) * interval '1 day')
    group by 1
  )
  select d.day, coalesce(p.revenue, 0) as revenue
  from days d
  left join paid p using (day)
  order by d.day;
end;
$$;

-- Zero-filled monthly revenue series from the earliest paid order's month through the current
-- month — backs the "All time" range (daily buckets would be too many points once the store has
-- more than a few months of history).
create or replace function public.admin_revenue_monthly()
returns table (month date, revenue numeric)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  return query
  with bounds as (
    select coalesce(date_trunc('month', min(o.created_at)), date_trunc('month', now())) as start_month
    from public.orders o
    where o.payment_status = 'paid'
  ),
  months as (
    select generate_series(start_month, date_trunc('month', now()), interval '1 month')::date as month
    from bounds
  ),
  paid as (
    select date_trunc('month', o.created_at)::date as month, sum(o.total_amount) as revenue
    from public.orders o
    where o.payment_status = 'paid'
    group by 1
  )
  select m.month, coalesce(p.revenue, 0) as revenue
  from months m
  left join paid p using (month)
  order by m.month;
end;
$$;

-- Best sellers by revenue (paid orders only) — one grouped/sorted/limited query instead of
-- pulling every `order_items` row for the app layer to group in JS.
create or replace function public.admin_top_products(p_limit integer default 5)
returns table (
  product_id uuid,
  name text,
  slug text,
  image text,
  total_quantity bigint,
  total_revenue numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  p_limit := least(greatest(p_limit, 1), 50);

  return query
  select
    p.id,
    p.name,
    p.slug,
    p.image,
    sum(oi.quantity)::bigint,
    sum(oi.quantity * oi.price)
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  join public.products p on p.id = oi.product_id
  where o.payment_status = 'paid'
  group by p.id, p.name, p.slug, p.image
  order by sum(oi.quantity * oi.price) desc
  limit p_limit;
end;
$$;
