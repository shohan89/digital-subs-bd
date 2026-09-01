-- Adds moderation to `reviews`: a `status` column (not a boolean `is_approved` — kept consistent
-- with `orders`/`payments`/`subscriptions` all using a text status enum rather than a boolean flag
-- elsewhere in this schema) plus RLS to actually enforce two rules the application layer alone
-- can't guarantee:
--   1. Only a "verified buyer" (a completed order containing this product) can insert a review.
--   2. Only approved reviews are publicly visible; a customer can still see their own regardless
--      of status, and a customer can only edit their review while it's still pending (not after
--      an admin has already acted on it).
-- `unique (product_id, user_id)` already exists from the original migration — one review per
-- customer per product is already enforced, nothing new needed there.

alter table public.reviews
  add column status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected'));

create index reviews_status_idx on public.reviews (status);

drop policy "Reviews: public read" on public.reviews;

create policy "Reviews: public read approved"
  on public.reviews for select
  using (status = 'approved');

create policy "Reviews: view own"
  on public.reviews for select
  using (user_id = auth.uid());

drop policy "Reviews: insert own" on public.reviews;

create policy "Reviews: insert own verified buyer"
  on public.reviews for insert
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and exists (
      select 1
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.product_id = reviews.product_id
        and o.user_id = auth.uid()
        and o.status = 'completed'
    )
  );

drop policy "Reviews: update own" on public.reviews;

create policy "Reviews: update own pending"
  on public.reviews for update
  using (user_id = auth.uid() and status = 'pending')
  with check (user_id = auth.uid() and status = 'pending');

-- "Reviews: admin full access" (unchanged) is what actually moves a review to approved/rejected.
