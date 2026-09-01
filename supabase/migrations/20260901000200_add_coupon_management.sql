-- Full coupon management: fills in `coupons`' deliberately-leaner original shape (see that
-- table's own migration comment — it shipped with only code/discount_type/discount_value/
-- expiry_date, no activation/usage-limit/minimum-order machinery at all), adds `coupon_usages` for
-- redemption tracking, wires a discount into `orders`, and extends `order_activity`'s vocabulary.

alter table public.coupons
  add column min_order_amount numeric(10, 2),
  add column max_discount numeric(10, 2),
  add column start_date timestamptz,
  add column usage_limit integer,
  add column per_user_usage_limit integer,
  add column is_active boolean not null default true,
  add column used_count integer not null default 0,
  add constraint coupons_min_order_amount_check check (min_order_amount is null or min_order_amount >= 0),
  add constraint coupons_max_discount_check check (max_discount is null or max_discount >= 0),
  add constraint coupons_usage_limit_check check (usage_limit is null or usage_limit > 0),
  add constraint coupons_per_user_usage_limit_check check (per_user_usage_limit is null or per_user_usage_limit > 0),
  add constraint coupons_used_count_check check (used_count >= 0),
  add constraint coupons_date_range_check check (start_date is null or expiry_date is null or start_date <= expiry_date);

-- Redemption history — one row per order a coupon was actually applied to (not per attempt; a
-- rejected/invalid application never reaches this table). `coupon_id` is `on delete restrict`,
-- not `set null`/`cascade`: a coupon with real redemption history is exactly the "unsafe to
-- delete" case `deleteCouponAction`'s pre-check exists for, matching `order_items.product_id`'s
-- own `on delete restrict` reasoning (a financial/audit record, not disposable). `discount_amount`
-- is a snapshot of what was actually deducted for this specific order — the coupon's own
-- `discount_value`/`discount_type` can change later without rewriting history.
create table public.coupon_usages (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  discount_amount numeric(10, 2) not null check (discount_amount >= 0),
  created_at timestamptz not null default now()
);

create index coupon_usages_coupon_id_idx on public.coupon_usages (coupon_id);
create index coupon_usages_user_id_coupon_id_idx on public.coupon_usages (user_id, coupon_id);

alter table public.coupon_usages enable row level security;

-- Admin-only, matching `coupons` itself — same reasoning as that table's own policy comment (this
-- is business/revenue data, not something a customer session reads directly; checkout redemption
-- always runs on the service-role client via `redeem_coupon()`, same as order/payment creation).
create policy "Coupon usages: admin full access"
  on public.coupon_usages for all
  using (public.is_admin())
  with check (public.is_admin());

-- `orders.discount_amount` (always present, defaults 0) + `orders.coupon_code` (nullable snapshot,
-- same "snapshot not live join" reasoning as `customer_name`/`customer_email`) — no separate
-- `subtotal_amount` column: subtotal is always recoverable as `total_amount + discount_amount`,
-- so storing it too would just be a derivable duplicate.
alter table public.orders
  add column discount_amount numeric(10, 2) not null default 0 check (discount_amount >= 0),
  add column coupon_code text;

-- New order-lifecycle event: a coupon was successfully redeemed against this order. Logged from
-- inside `redeem_coupon()` itself (see below), not a separate JS call, for the same atomicity
-- reason `approve_payment()` logs its own `order_activity` rows internally.
alter table public.order_activity drop constraint order_activity_action_check;
alter table public.order_activity add constraint order_activity_action_check
  check (action in (
    'order_created', 'payment_submitted', 'payment_approved', 'payment_rejected',
    'order_processing', 'subscription_delivered', 'order_completed', 'order_cancelled',
    'coupon_applied'
  ));

-- Atomic redemption claim — the actual enforcement boundary for "prevent usage limit violations"
-- under concurrent checkouts, the same `for update`-row-lock idiom as `approve_payment`'s
-- conditional-UPDATE claim (see that function's header comment in
-- `20260831000200_add_payment_verification_functions.sql`). `checkoutService.placeOrder` also
-- runs a read-only pre-check (`couponsService.validateCoupon`) *before* creating the order, purely
-- for fast, clean UX on an obviously-bad coupon (expired, wrong code, below minimum) — this
-- function is what actually matters: it re-validates everything from scratch under the lock, so a
-- coupon that raced past its usage limit between the pre-check and this call is still caught here,
-- not just at the pre-check.
--
-- `language plpgsql volatile`, invoker rights (no `security definer`) — unlike `find_customer_by_email`,
-- this is only ever called from `checkoutService.placeOrder`, which already runs on the
-- service-role client (see that service's doc comment on why: customers have no DELETE policy on
-- `orders` for the rollback path). There's no RLS gap to bypass here that the caller doesn't
-- already have.
--
-- `returns table` columns are `out_*`-prefixed per the standard lesson from that same payment
-- migration: an unprefixed name colliding with a real column referenced in the body (`coupons`/
-- `coupon_usages`/`order_activity` all have real columns this function touches) produces a
-- runtime-only "ambiguous column reference" error, not a `create function`-time one.
create or replace function public.redeem_coupon(
  p_coupon_id uuid,
  p_user_id uuid,
  p_order_id uuid,
  p_discount_amount numeric
)
returns table (out_usage_id uuid)
language plpgsql
volatile
as $$
declare
  v_code text;
  v_is_active boolean;
  v_start_date timestamptz;
  v_expiry_date timestamptz;
  v_usage_limit integer;
  v_used_count integer;
  v_per_user_limit integer;
  v_user_used_count integer;
  v_usage_id uuid;
begin
  -- Row lock first — serializes concurrent redemption attempts against this *specific* coupon;
  -- a different coupon's redemption is entirely unaffected.
  select code, is_active, start_date, expiry_date, usage_limit, used_count, per_user_usage_limit
  into v_code, v_is_active, v_start_date, v_expiry_date, v_usage_limit, v_used_count, v_per_user_limit
  from public.coupons
  where id = p_coupon_id
  for update;

  if not found then
    raise exception 'This coupon no longer exists.';
  end if;
  if not v_is_active then
    raise exception 'This coupon is no longer active.';
  end if;
  if v_start_date is not null and v_start_date > now() then
    raise exception 'This coupon is not active yet.';
  end if;
  if v_expiry_date is not null and v_expiry_date < now() then
    raise exception 'This coupon has expired.';
  end if;
  if v_usage_limit is not null and v_used_count >= v_usage_limit then
    raise exception 'This coupon has reached its usage limit.';
  end if;

  if v_per_user_limit is not null then
    select count(*) into v_user_used_count from public.coupon_usages where coupon_id = p_coupon_id and user_id = p_user_id;
    if v_user_used_count >= v_per_user_limit then
      raise exception 'You have already used this coupon the maximum number of times.';
    end if;
  end if;

  update public.coupons set used_count = used_count + 1 where id = p_coupon_id;

  insert into public.coupon_usages (coupon_id, user_id, order_id, discount_amount)
  values (p_coupon_id, p_user_id, p_order_id, p_discount_amount)
  returning id into v_usage_id;

  insert into public.order_activity (order_id, actor_id, actor_name, action, note)
  values (p_order_id, null, null, 'coupon_applied', v_code || ' (-' || p_discount_amount || ')');

  return query select v_usage_id;
end;
$$;
