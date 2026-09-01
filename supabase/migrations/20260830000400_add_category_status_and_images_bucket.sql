-- `categories` shipped with no `status`/`is_active` column at all (see that table's original
-- migration comment — deliberately dropped from an earlier revision, "no way to hide one without
-- deleting it"). Admin category management needs a real deactivate action, so it comes back here
-- as a two-value text status (`active`/`inactive`), matching this schema's established
-- text-status convention elsewhere (`orders`/`payments`/`subscriptions`/`products`/`reviews`) —
-- not a boolean, and not `products.status`'s three-value `draft`/`active`/`archived` (categories
-- have no "draft" concept the way an unfinished product listing does).

alter table public.categories
  add column status text not null default 'active' check (status in ('active', 'inactive'));

-- Narrows public read to active categories only — staff still see every status via the existing
-- "Categories: staff full access" policy (`for all`, so it already covers select regardless of
-- status). Same shape as `products`' "public read active-only" + "staff full access" split.
drop policy "Categories: public read" on public.categories;
create policy "Categories: public read active"
  on public.categories for select
  using (status = 'active');

-- Public bucket for category images — same reasoning as `product-images`
-- (`20260830000300_add_product_images_bucket.sql`): readable by anonymous shop visitors via the
-- `/storage/v1/object/public/...` path (already allowlisted in `next.config.ts`), write access
-- gated by `is_staff()`.

insert into storage.buckets (id, name, public)
values ('category-images', 'category-images', true)
on conflict (id) do nothing;

create policy "Category images: public read"
  on storage.objects for select
  using (bucket_id = 'category-images');

create policy "Category images: staff insert"
  on storage.objects for insert
  with check (bucket_id = 'category-images' and public.is_staff());

create policy "Category images: staff update"
  on storage.objects for update
  using (bucket_id = 'category-images' and public.is_staff())
  with check (bucket_id = 'category-images' and public.is_staff());

create policy "Category images: staff delete"
  on storage.objects for delete
  using (bucket_id = 'category-images' and public.is_staff());
