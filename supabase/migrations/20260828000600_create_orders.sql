-- `status` (fulfillment) and `payment_status` are separate columns now, instead of one combined
-- order status — cleaner than conflating "has this been paid" with "has this been fulfilled".
-- No `order_number`/`subtotal`/`discount`/`coupon_code` in this revision's field list; see the
-- "Known mismatch" note in PROJECT_STRUCTURE.md — `ordersService.createOrder` currently writes
-- all four.
--
-- `user_id` stays ON DELETE RESTRICT: an order is a financial record, not disposable per-user
-- data — deleting a profile that has orders should fail loudly, not silently destroy the record.

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'cancelled')),
  total_amount numeric(10, 2) not null check (total_amount >= 0),
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_user_id_idx on public.orders (user_id);
create index orders_status_idx on public.orders (status);
create index orders_payment_status_idx on public.orders (payment_status);

create trigger set_orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

alter table public.orders enable row level security;

-- Customer: can view own orders (explicitly required).
create policy "Orders: view own"
  on public.orders for select
  using (user_id = auth.uid());

-- Not in the brief's explicit policy list, but required for the already-built
-- `createOrderAction` -> `ordersService.createOrder` to work at all: it inserts through the
-- caller's own session-scoped Supabase client, not the service-role client, so without this the
-- insert is denied by RLS regardless of application-level auth checks.
create policy "Orders: insert own"
  on public.orders for insert
  with check (user_id = auth.uid());

-- Admin: full access (explicitly required).
create policy "Orders: admin full access"
  on public.orders for all
  using (public.is_admin())
  with check (public.is_admin());
