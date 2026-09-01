-- Append-only order activity/history — backs the admin order detail page's timeline. Every
-- status-affecting event (placement, payment approval/rejection, fulfillment status changes) gets
-- one row here; nothing is ever updated or deleted.
--
-- `actor_name` is a snapshot, not a live join to `profiles` — a manager viewing a timeline entry
-- performed by an admin would otherwise hit the same gap `admin_dashboard_stats()` was built
-- around: `profiles` SELECT policy is "view own" + `is_admin()`-only, not `is_staff()`, so a
-- nested `profiles(full_name)` select on this table would silently come back null for any actor
-- who isn't the viewer or an admin. Capturing the actor's own name at write time (which they
-- always have permission to read, being their own row) sidesteps that instead of widening
-- `profiles` RLS just for this.

create table public.order_activity (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  -- Null for a system/customer-triggered event — order placement runs on the service-role client
  -- during checkout, with no staff actor to attribute it to.
  actor_id uuid references public.profiles (id) on delete set null,
  actor_name text,
  action text not null
    check (action in ('order_placed', 'payment_approved', 'payment_rejected', 'status_changed')),
  from_value text,
  to_value text,
  note text,
  created_at timestamptz not null default now()
);

create index order_activity_order_id_created_at_idx on public.order_activity (order_id, created_at);

alter table public.order_activity enable row level security;

-- Symmetric with orders/order_items/payments/subscriptions' own "view own" policies — no
-- customer-facing UI reads this yet, but the access shape should already match its siblings
-- rather than needing another migration later just to add it.
create policy "Order activity: view own"
  on public.order_activity for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

create policy "Order activity: staff full access"
  on public.order_activity for all
  using (public.is_staff())
  with check (public.is_staff());
