-- Public bucket for product main/gallery images — unlike `payment-screenshots` (private, only
-- ever touched by service-role code, see that bucket's own notes), product images must be
-- readable by anonymous shop visitors, so this bucket is created with `public = true`. A public
-- bucket serves objects via the `/storage/v1/object/public/...` path without evaluating
-- `storage.objects` RLS at all (that's what makes it "public") — `next.config.ts`'s
-- `images.remotePatterns` already allowlists exactly that path shape, confirming this is the
-- intended architecture, not a new one invented here.
--
-- Write access (insert/update/delete) is still gated by `is_staff()` below — a public bucket only
-- affects *read*, not who can upload to it. The read policy is added anyway (defense in depth for
-- the authenticated API path — `.list()`/`.download()` — which does still evaluate RLS, unlike
-- the public URL path).

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "Product images: public read"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "Product images: staff insert"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and public.is_staff());

create policy "Product images: staff update"
  on storage.objects for update
  using (bucket_id = 'product-images' and public.is_staff())
  with check (bucket_id = 'product-images' and public.is_staff());

create policy "Product images: staff delete"
  on storage.objects for delete
  using (bucket_id = 'product-images' and public.is_staff());
