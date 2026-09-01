-- Refines `order_activity` (added in `20260830000500_add_order_activity.sql`) to match a more
-- precise spec: `old_status`/`new_status` column names (was `from_value`/`to_value` — kept
-- generic originally since payment approve/reject also logged a *payment* status transition, not
-- just an order one; renaming here since every actual value stored is still, in fact, a status),
-- a granular action vocabulary instead of one generic `status_changed`, and staff-only access —
-- an audit trail of *admin* actions has no reason to be customer-readable, unlike
-- orders/order_items/payments/subscriptions themselves.

alter table public.order_activity rename column from_value to old_status;
alter table public.order_activity rename column to_value to new_status;

alter table public.order_activity drop constraint order_activity_action_check;
alter table public.order_activity add constraint order_activity_action_check
  check (action in (
    'order_created',
    'payment_submitted',
    'payment_approved',
    'payment_rejected',
    'order_processing',
    'subscription_delivered',
    'order_completed',
    'order_cancelled'
  ));

-- Staff-only — see the file-level comment above for why this table dropped the customer "view
-- own" symmetry the sibling order tables have. Nothing customer-facing ever read this policy (no
-- UI queried `order_activity` from a customer session), so this tightens without breaking anything.
drop policy "Order activity: view own" on public.order_activity;
