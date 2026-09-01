-- No `is_active`/`max_uses`/`used_count`/`min_order_amount`/`description`/`starts_at` in this
-- revision's field list — validity is purely code + `expiry_date` (nullable: null = never
-- expires). There's no way to manually disable a coupon before its expiry without deleting it or
-- editing `expiry_date` into the past; that's a real limitation of this leaner shape, not an
-- oversight.

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(10, 2) not null check (discount_value >= 0),
  expiry_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (discount_type <> 'percentage' or discount_value <= 100)
);

create trigger set_coupons_updated_at
  before update on public.coupons
  for each row execute function public.set_updated_at();

alter table public.coupons enable row level security;

-- Admin-only, no public/customer policy: exposing the full coupon table would let anyone list
-- every code. Redemption should validate a single code server-side (service-role client or a
-- narrow SECURITY DEFINER RPC), not read this table directly — not built yet.
create policy "Coupons: admin full access"
  on public.coupons for all
  using (public.is_admin())
  with check (public.is_admin());
