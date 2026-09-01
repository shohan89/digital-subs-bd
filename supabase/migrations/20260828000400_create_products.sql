-- `price`/`compare_price`/`duration` now live directly on the product (a base price/duration for
-- buying it as-is) in addition to `product_variants` (alternate price/duration tiers) — a product
-- is purchasable on its own even with zero variant rows.
--
-- NOTE: this still normalizes category into its own table (`category_id` FK), which
-- `src/types/product.ts`'s `Product.category` / `src/constants/products.ts`'s
-- `PRODUCT_CATEGORIES` don't yet reflect — see the "Known mismatch" note in
-- PROJECT_STRUCTURE.md. Reconciling the service layer is still deliberately out of scope here.

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id) on delete set null,
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  description text,
  short_description text,
  price numeric(10, 2) not null check (price >= 0),
  compare_price numeric(10, 2) check (compare_price is null or compare_price >= price),
  duration integer check (duration is null or duration > 0), -- days; null = no fixed duration (variant-priced only)
  image text,
  gallery jsonb not null default '[]'::jsonb, -- array of image URLs
  features jsonb not null default '[]'::jsonb, -- array of feature bullet strings
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_category_id_idx on public.products (category_id);
create index products_status_idx on public.products (status);

create trigger set_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

alter table public.products enable row level security;

-- Products: public readable (explicitly required) — gated on `status = 'active'` since there's
-- no `is_active` boolean in this revision's field list.
create policy "Products: public read"
  on public.products for select
  using (status = 'active');

-- Admin: full access (explicitly required).
create policy "Products: admin full access"
  on public.products for all
  using (public.is_admin())
  with check (public.is_admin());
