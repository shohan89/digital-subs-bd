-- `name` is freeform text (e.g. "1 Month", "3 Months", "Lifetime"), not a constrained enum —
-- looser than the previous `billing_cycle` design, matching this table's current field list.

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name text not null,
  price numeric(10, 2) not null check (price >= 0),
  duration integer not null check (duration > 0), -- days
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index product_variants_product_id_idx on public.product_variants (product_id);

create trigger set_product_variants_updated_at
  before update on public.product_variants
  for each row execute function public.set_updated_at();

alter table public.product_variants enable row level security;

-- No `status`/`is_active` column here either — visibility follows the parent product's, so a
-- variant of a draft/archived product doesn't leak through this table once the product itself is
-- hidden from `Products: public read`.
create policy "Product variants: public read"
  on public.product_variants for select
  using (exists (
    select 1 from public.products p
    where p.id = product_id and p.status = 'active'
  ));

create policy "Product variants: admin full access"
  on public.product_variants for all
  using (public.is_admin())
  with check (public.is_admin());
