-- Two changes, both driven by the full review-moderation admin page this migration backs:
--
-- 1. `reviews.status`'s third value renames `rejected` -> `hidden` — the task's own vocabulary,
--    and a better semantic fit for what this action actually means (an admin taking a review out
--    of public view, not a workflow "rejection" of a request). `hidden` reviews can still be
--    re-approved later (see `moderateReviewAction`), unlike a typical terminal "rejected" state.
--
-- 2. `reviewer_name`/`reviewer_email` snapshot columns, backfilled from `profiles` here (a raw
--    migration isn't subject to RLS, so this join works regardless) and populated going forward by
--    `reviewsService.createReview` at submission time. This fixes a real, pre-existing bug: the
--    admin list previously joined `reviewer:profiles(full_name, email)` live, but `profiles`
--    SELECT is `is_admin()`-only — a manager viewing `/admin/reviews` (gated `requireStaff()`,
--    admin OR manager, same as every other operational admin page) got `null` back for every
--    reviewer's name/email, not an error, so it read as "working" while silently showing nothing
--    useful. Same "snapshot instead of live join across an RLS gap" fix already applied to
--    `orders.customer_name`/`subscriptions.customer_name` — and it's what makes reviewer search
--    possible at all (`.ilike()` on a real column instead of a cross-table join PostgREST's
--    `.or()` can't reach anyway).

update public.reviews set status = 'hidden' where status = 'rejected';

alter table public.reviews drop constraint reviews_status_check;
alter table public.reviews add constraint reviews_status_check
  check (status in ('pending', 'approved', 'hidden'));

alter table public.reviews add column reviewer_name text;
alter table public.reviews add column reviewer_email text;

update public.reviews r
set reviewer_name = p.full_name, reviewer_email = p.email
from public.profiles p
where p.id = r.user_id;

alter table public.reviews alter column reviewer_email set not null;
