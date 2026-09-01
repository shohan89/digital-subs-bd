-- Full admin subscription management: traces a subscription back to the order that created it,
-- adds a customer-name/email snapshot (mirroring `orders.customer_name`/`customer_email` — see
-- that table's migration comment for why a snapshot beats a live `profiles` join: `profiles` only
-- grants SELECT to `is_admin()`, not `is_staff()`, so a manager's session joining `profiles`
-- directly would silently get nulls back, the exact gap `admin_dashboard_stats()` was built to
-- avoid), a `subscription_deliveries` table for sensitive access credentials, and a
-- `subscription_activity` audit trail mirroring `order_activity`'s exact shape/RLS decisions.

alter table public.subscriptions
  add column order_id uuid references public.orders (id) on delete set null,
  add column customer_name text,
  add column customer_email text;

create index subscriptions_order_id_idx on public.subscriptions (order_id);

-- `order_id` is nullable and `on delete set null` (not `restrict`) — a subscription can be created
-- manually by an admin with no order behind it at all (comp access, migrated customer, etc.), and
-- unlike `order_items`/`payments` referencing an order, losing the order link on delete doesn't
-- orphan anything a customer relies on to use their subscription.

-- Sensitive account delivery credentials (account email/username/access instructions/profile
-- info) — a separate table, not columns on `subscriptions` itself, so that every existing
-- `select("*")` across the app (the admin list, `listExpiringSubscriptions`, ...) doesn't start
-- silently over-fetching credentials it never needed just to render a status badge. Only fetched
-- where a caller genuinely needs it: the admin subscription detail page and the owning customer's
-- own dashboard.
create table public.subscription_deliveries (
  subscription_id uuid primary key references public.subscriptions (id) on delete cascade,
  account_email text,
  account_username text,
  access_instructions text,
  profile_info text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

alter table public.subscription_deliveries enable row level security;

-- "Store sensitive information securely" / "never display on public pages": enforced here as
-- RLS row-level access control (owner + staff only, nobody else — matching every other
-- sensitive-row pattern already established in this schema: orders/payments/subscriptions
-- themselves), not column-level encryption. This codebase has no `pgp_sym_encrypt`/key-management
-- infrastructure anywhere (`pgcrypto` is enabled only for `gen_random_uuid()`), and Supabase
-- already encrypts data at rest at the storage layer — adding application-level encryption here
-- would introduce a new, inconsistent security primitive (and a new key to manage/rotate) for a
-- guarantee RLS + at-rest encryption already provides. The customer genuinely needs to read their
-- own delivery info to use the subscription (this isn't staff-only like `order_activity`), so
-- "view own" is a real SELECT policy, not omitted.
create policy "Subscription deliveries: staff full access"
  on public.subscription_deliveries for all
  using (public.is_staff())
  with check (public.is_staff());

create policy "Subscription deliveries: view own"
  on public.subscription_deliveries for select
  using (
    exists (
      select 1 from public.subscriptions s
      where s.id = subscription_deliveries.subscription_id
        and s.user_id = auth.uid()
    )
  );

-- Append-only audit trail for admin subscription actions — same shape and same staff-only
-- reasoning as `order_activity` (see `20260831000100_refine_order_activity.sql`): an internal
-- record of who did what, not customer-facing status information. `old_value`/`new_value` are
-- free-text (an ISO date string for expiry-related actions, a status string for cancel/
-- reactivate, null for delivery_updated) rather than typed columns, matching `order_activity`'s
-- `old_status`/`new_status` shape.
create table public.subscription_activity (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  actor_name text,
  action text not null check (action in (
    'subscription_created', 'subscription_extended', 'expiry_changed',
    'subscription_cancelled', 'subscription_reactivated', 'delivery_updated'
  )),
  old_value text,
  new_value text,
  note text,
  created_at timestamptz not null default now()
);

create index subscription_activity_subscription_id_created_at_idx
  on public.subscription_activity (subscription_id, created_at);

alter table public.subscription_activity enable row level security;

create policy "Subscription activity: staff full access"
  on public.subscription_activity for all
  using (public.is_staff())
  with check (public.is_staff());

-- Lets a staff session (including a manager, who can't read `profiles` directly — see the
-- top-of-file comment) resolve a customer by email when manually creating a subscription, without
-- broadening `profiles`' RLS. Same `security definer` + explicit `is_staff()` guard pattern as
-- `admin_dashboard_stats()` and friends — narrow (one row, three columns), not a general profiles
-- browsing capability (that stays `/admin/customers`, `requireAdmin()`-only).
create or replace function public.find_customer_by_email(p_email text)
returns table (out_id uuid, out_full_name text, out_email text)
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
  select p.id, p.full_name, p.email
  from public.profiles p
  where lower(p.email) = lower(p_email)
  limit 1;
end;
$$;

-- `approve_payment()` must now also populate the new `order_id`/`customer_name`/`customer_email`
-- columns on every auto-provisioned subscription, and log a `subscription_created` entry per
-- subscription so a subscription's own history is complete regardless of whether it was created
-- here or manually by an admin. Return-table shape (`out_payment_id`/`out_order_id`/
-- `out_order_status`) is unchanged, so `create or replace` is enough — no `drop function` needed
-- (see `20260831000200_...`'s header comment for when that would be required).
create or replace function public.approve_payment(
  p_payment_id uuid,
  p_actor_id uuid,
  p_actor_name text
)
returns table (out_payment_id uuid, out_order_id uuid, out_order_status text)
language plpgsql
volatile
as $$
declare
  v_order_id uuid;
  v_user_id uuid;
  v_order_status text;
  v_customer_name text;
  v_customer_email text;
  v_product_names text;
begin
  update public.payments
  set status = 'verified'
  where id = p_payment_id and status = 'pending'
  returning order_id into v_order_id;

  if v_order_id is null then
    raise exception 'This payment has already been reviewed or does not exist.';
  end if;

  select user_id, status, customer_name, customer_email
  into v_user_id, v_order_status, v_customer_name, v_customer_email
  from public.orders
  where id = v_order_id;

  if v_user_id is null then
    raise exception 'Order not found for this payment.';
  end if;

  -- One subscription per distinct product in the order, carrying the order id and the order's own
  -- customer-name/email snapshot forward onto the subscription (same snapshot-not-live-join
  -- reasoning as `orders.customer_name`/`customer_email` themselves). `products.duration` is
  -- nullable ("variant-priced only" — `order_items` has no `variant_id` to recover the actual
  -- variant's duration from at this point, matching the application layer's own documented gap),
  -- so this falls back to 30 days rather than failing the whole approval outright.
  with distinct_products as (
    select distinct oi.product_id, p.duration, p.name
    from public.order_items oi
    join public.products p on p.id = oi.product_id
    where oi.order_id = v_order_id
  ),
  inserted_subs as (
    insert into public.subscriptions (user_id, product_id, order_id, customer_name, customer_email, status, start_date, expiry_date)
    select v_user_id, product_id, v_order_id, v_customer_name, v_customer_email, 'active', now(),
           now() + make_interval(days => coalesce(duration, 30))
    from distinct_products
    returning id
  )
  insert into public.subscription_activity (subscription_id, actor_id, actor_name, action, note)
  select id, p_actor_id, p_actor_name, 'subscription_created', 'Provisioned automatically after payment verification'
  from inserted_subs;

  select string_agg(p.name, ', ' order by p.name)
  into v_product_names
  from (select distinct oi.product_id from public.order_items oi where oi.order_id = v_order_id) d
  join public.products p on p.id = d.product_id;

  insert into public.order_activity (order_id, actor_id, actor_name, action, note)
  values (v_order_id, p_actor_id, p_actor_name, 'subscription_delivered', v_product_names);

  update public.orders set payment_status = 'paid' where id = v_order_id;

  insert into public.order_activity (order_id, actor_id, actor_name, action, old_status, new_status)
  values (v_order_id, p_actor_id, p_actor_name, 'payment_approved', 'pending', 'verified');

  if v_order_status = 'pending' then
    update public.orders set status = 'processing' where id = v_order_id;
    insert into public.order_activity (order_id, actor_id, actor_name, action, old_status, new_status)
    values (v_order_id, p_actor_id, p_actor_name, 'order_processing', 'pending', 'processing');
    v_order_status := 'processing';
  end if;

  insert into public.notifications (user_id, title, message, read)
  values (
    v_user_id,
    'Payment verified',
    'Your payment for order ' || left(v_order_id::text, 8) || ' has been verified — your subscription is now active.',
    false
  );

  return query select p_payment_id, v_order_id, v_order_status;
end;
$$;
