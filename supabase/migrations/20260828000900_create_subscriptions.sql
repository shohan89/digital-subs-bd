-- No `order_id`/`variant_id`/`access_details`/`auto_renew` in this revision's field list — a
-- subscription is just "this user has access to this product until this date", with no traceable
-- link back to the order/variant that created it. `subscriptionsService.activateSubscription`
-- currently writes all four of those dropped columns; see the "Known mismatch" note in
-- PROJECT_STRUCTURE.md.
--
-- `user_id`/`product_id` stay ON DELETE RESTRICT for the same reason as `orders.user_id`: an
-- active or historical subscription is a record that needs an explicit decision to remove, not a
-- silent cascade.

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  product_id uuid not null references public.products (id) on delete restrict,
  start_date timestamptz not null default now(),
  expiry_date timestamptz not null,
  status text not null default 'active'
    check (status in ('active', 'expiring_soon', 'expired', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_user_id_idx on public.subscriptions (user_id);
-- Matches `subscriptionsService.listExpiringSubscriptions`'s `.eq("status", "active").lte("expires_at", cutoff)`.
create index subscriptions_status_expiry_date_idx on public.subscriptions (status, expiry_date);

create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;

-- Customer: can view own subscriptions (explicitly required).
create policy "Subscriptions: view own"
  on public.subscriptions for select
  using (user_id = auth.uid());

-- Deliberately no customer INSERT/UPDATE policy — provisioning and renewal should both go
-- through the service-role client (once a payment is actually verified), never a customer's own
-- session-scoped client. Don't add one as a workaround for an action that fails RLS; fix how that
-- action provisions/renews instead.
create policy "Subscriptions: admin full access"
  on public.subscriptions for all
  using (public.is_admin())
  with check (public.is_admin());
