-- Full notification system: `notifications` already existed (generic `title`/`message`, no
-- machine-readable kind) — this adds `type` (a closed vocabulary covering every notification this
-- app now sends) and `related_id` (an informal, untyped-FK reference to whatever row the
-- notification is about — an order, subscription, or review; deliberately no real foreign key,
-- since it points at different tables depending on `type`). Both exist for two concrete reasons,
-- not just categorization:
--   1. Dedup — `notificationsService.createNotificationIfNotExists` checks for an existing row by
--      `(user_id, type, related_id)` before inserting, which is what "do not create excessive
--      duplicate notifications" actually means in code, not just a design intention.
--   2. The notification center UI (`/dashboard/notifications`) renders a per-type icon.

alter table public.notifications add column type text;
alter table public.notifications add column related_id uuid;

-- Backfill every existing row from its (already-shipped, unchanged) title text — the only two
-- notification-creating code paths before this migration were payment verification
-- (approve_payment/reject_payment) and review moderation (moderateReviewAction), so these four
-- cases are exhaustive; the fallback exists only as a safety net for any row this reasoning missed,
-- so the NOT NULL constraint below can never fail.
update public.notifications set type = 'payment_approved' where title = 'Payment verified';
update public.notifications set type = 'payment_rejected' where title = 'Payment rejected';
update public.notifications set type = 'review_published' where title = 'Review published';
update public.notifications set type = 'review_hidden' where title = 'Review not published';
update public.notifications set type = 'order_received' where type is null;

alter table public.notifications alter column type set not null;
alter table public.notifications add constraint notifications_type_check check (type in (
  -- Customer-facing
  'order_received', 'payment_submitted', 'payment_approved', 'payment_rejected',
  'subscription_delivered', 'subscription_expiring', 'subscription_expired',
  'review_published', 'review_hidden',
  -- Staff-facing (addressed to a staff member's own user_id, same as any other row here — no
  -- separate "admin notification" table or column needed, the recipient alone distinguishes it)
  'new_order', 'new_payment_submission', 'new_review'
  -- 'subscription_expiring' is reused for the staff-facing "expiring soon" notification too (see
  -- the app-layer doc comment on `syncSubscriptionLifecycleNotifications`) — same type, different
  -- recipient, so it isn't listed twice here.
));

-- Backs the dedup lookup above and the notification center's future per-type filtering.
create index notifications_user_type_related_idx on public.notifications (user_id, type, related_id);

-- `/dashboard/notifications`' delete feature needs this — it didn't exist before (the only DELETE
-- policy was admin-only "full access"), so a customer literally could not delete their own
-- notification until now.
create policy "Notifications: delete own"
  on public.notifications for delete
  using (user_id = auth.uid());
