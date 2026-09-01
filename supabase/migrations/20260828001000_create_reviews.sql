-- No `is_approved`/`title` in this revision's field list — a review is public as soon as it's
-- created, with no moderation queue. If moderation turns out to be needed, that's an `is_approved`
-- column + a gated read policy to add deliberately later, not something to infer here.

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create index reviews_product_id_idx on public.reviews (product_id);

create trigger set_reviews_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

alter table public.reviews enable row level security;

create policy "Reviews: public read"
  on public.reviews for select
  using (true);

create policy "Reviews: insert own"
  on public.reviews for insert
  with check (user_id = auth.uid());

create policy "Reviews: update own"
  on public.reviews for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Reviews: admin full access"
  on public.reviews for all
  using (public.is_admin())
  with check (public.is_admin());
