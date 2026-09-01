-- `admin_dashboard_stats()`'s `expiring_soon_subscriptions` column counted rows with a literal
-- `status = 'expiring_soon'` — a value nothing in this codebase has ever written to
-- `subscriptions.status` (only `'active'`/`'cancelled'` are ever stored; `'expiring_soon'`/
-- `'expired'` are always *computed* display values, derived from `expiry_date` at render time via
-- `getSubscriptionStatus`). This field was therefore always `0` in practice, silently dead weight
-- — never even rendered by any component (confirmed by grep before writing this migration). Real
-- subscription-lifecycle counts (expiring within 3/7 days, expired) now come from
-- `subscriptionsService.getSubscriptionLifecycleCounts`, computed the correct way: from
-- `expiry_date` directly, using Bangladesh-calendar-day cutoffs
-- (`utils/timezone.ts`'s `bangladeshCalendarDayCutoff`) that agree exactly with
-- `getSubscriptionStatus`'s own badge logic — not a second, differently-defined "expiring soon"
-- living in SQL.
--
-- `create or replace` can't change a function's return-column list, only its body — a `drop
-- function` is required first when a `returns table` shape changes, same as
-- `20260831000200_add_payment_verification_functions.sql`'s header comment already documents for
-- exactly this reason.
drop function if exists public.admin_dashboard_stats();

create or replace function public.admin_dashboard_stats()
returns table (
  total_revenue numeric,
  total_orders bigint,
  pending_orders bigint,
  processing_orders bigint,
  completed_orders bigint,
  cancelled_orders bigint,
  active_subscriptions bigint,
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
    (select count(*) from public.profiles p where p.role = 'customer'),
    (select count(*) from public.payments pay where pay.status = 'pending'),
    (select count(*) from public.reviews r where r.status = 'pending');
end;
$$;
