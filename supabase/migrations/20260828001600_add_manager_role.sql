-- Widens `profiles.role` to a 3-tier model (customer/manager/admin). "Manager" gets real
-- read/write access to the *operational* tables an admin panel's day-to-day work touches
-- (catalog, orders, payments, subscriptions, reviews) — not just an app-layer-permitted page
-- shell that silently fails every query underneath. `profiles`/`coupons`/`settings` stay
-- admin-only at the RLS level, matching the application-layer split (role management and
-- site-wide config are not "operational").

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('customer', 'manager', 'admin'));

-- Parallel to `is_admin()` (identical security properties — `language sql stable security
-- definer set search_path = public`, same self-reference-avoidance reasoning) — "is this caller
-- staff" (admin OR manager). A separate function, not a broadened `is_admin()`, so `is_admin()`
-- keeps meaning "exactly admin" for the policies that still need that (profiles/coupons/settings).
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'manager')
  );
$$;

-- Operational tables: replace the admin-only "full access" policy with a staff one. `is_staff()`
-- is true for admins too, so this is a strict widening — no admin behavior changes.
drop policy "Categories: admin full access" on public.categories;
create policy "Categories: staff full access"
  on public.categories for all
  using (public.is_staff())
  with check (public.is_staff());

drop policy "Products: admin full access" on public.products;
create policy "Products: staff full access"
  on public.products for all
  using (public.is_staff())
  with check (public.is_staff());

drop policy "Product variants: admin full access" on public.product_variants;
create policy "Product variants: staff full access"
  on public.product_variants for all
  using (public.is_staff())
  with check (public.is_staff());

drop policy "Orders: admin full access" on public.orders;
create policy "Orders: staff full access"
  on public.orders for all
  using (public.is_staff())
  with check (public.is_staff());

drop policy "Order items: admin full access" on public.order_items;
create policy "Order items: staff full access"
  on public.order_items for all
  using (public.is_staff())
  with check (public.is_staff());

drop policy "Payments: admin full access" on public.payments;
create policy "Payments: staff full access"
  on public.payments for all
  using (public.is_staff())
  with check (public.is_staff());

drop policy "Subscriptions: admin full access" on public.subscriptions;
create policy "Subscriptions: staff full access"
  on public.subscriptions for all
  using (public.is_staff())
  with check (public.is_staff());

drop policy "Reviews: admin full access" on public.reviews;
create policy "Reviews: staff full access"
  on public.reviews for all
  using (public.is_staff())
  with check (public.is_staff());

-- `notifications` stays admin-only for full read/update/delete access, but review moderation
-- (`moderateReviewAction`, operational) creates a notification *for the reviewer* using the
-- caller's own session-scoped client — a manager doing that needs INSERT, not the full grant a
-- broader policy would give them over every user's notifications.
create policy "Notifications: staff insert"
  on public.notifications for insert
  with check (public.is_staff());

-- `profiles`/`coupons`/`settings` intentionally untouched — role management and site-wide config
-- stay admin-only, at both the RLS and application layer.
