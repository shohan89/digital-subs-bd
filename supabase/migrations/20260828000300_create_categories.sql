-- No `is_active` column in this revision — categories are public-read unconditionally, with no
-- way to hide one without deleting it. (Previously had `icon`/`sort_order`/`is_active`; dropped
-- to match this table's current field list.)

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  image text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

alter table public.categories enable row level security;

create policy "Categories: public read"
  on public.categories for select
  using (true);

create policy "Categories: admin full access"
  on public.categories for all
  using (public.is_admin())
  with check (public.is_admin());
