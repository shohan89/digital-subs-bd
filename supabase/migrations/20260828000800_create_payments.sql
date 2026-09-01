-- `transaction_id` + `screenshot` (a Storage path/URL to an uploaded payment-proof image) reads
-- as a manual-verification flow — customer pays via bKash/Nagad "Send Money" outside the app,
-- then submits the transaction ID and a screenshot for an admin to confirm — rather than the
-- automated gateway-webhook flow `src/app/api/webhooks/payment/route.ts` currently implements
-- (no `amount`/`currency`/`gateway_response` columns in this revision). That route and
-- `paymentsService` will need reworking to match before this can go live; not done here.

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  method text not null check (method in ('bkash', 'nagad', 'rocket', 'card', 'sslcommerz')),
  transaction_id text,
  screenshot text,
  status text not null default 'pending'
    check (status in ('pending', 'verified', 'rejected', 'refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payments_order_id_idx on public.payments (order_id);
-- Partial + unique: multiple "pending" payments can share a null transaction_id before the
-- customer submits one, but a real transaction_id must be unique once present — guards against
-- two different payments being verified off the same manual reference.
create unique index payments_transaction_id_key on public.payments (transaction_id)
  where transaction_id is not null;

create trigger set_payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

alter table public.payments enable row level security;

-- Not in the brief's explicit policy list, but the same "view own orders" idea extended one
-- level, and required for `initiatePaymentAction` -> `paymentsService.initiatePayment`'s insert
-- to work under the caller's own session-scoped client (no direct `user_id` column here either —
-- ownership is via the parent order, same as `order_items`). A customer submitting their
-- transaction_id/screenshot is also an UPDATE of their own pending payment row, so that's
-- included too — scoped to `status = 'pending'` so they can't touch a row an admin already
-- verified/rejected.
create policy "Payments: view own"
  on public.payments for select
  using (exists (
    select 1 from public.orders o
    where o.id = order_id and o.user_id = auth.uid()
  ));

create policy "Payments: insert own"
  on public.payments for insert
  with check (exists (
    select 1 from public.orders o
    where o.id = order_id and o.user_id = auth.uid()
  ));

create policy "Payments: update own pending"
  on public.payments for update
  using (
    status = 'pending'
    and exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  )
  with check (
    status = 'pending'
    and exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

-- Admin: full access — this is what actually moves a payment to verified/rejected/refunded.
create policy "Payments: admin full access"
  on public.payments for all
  using (public.is_admin())
  with check (public.is_admin());
