import type { OrderActivityAction } from "@/types/order-activity";

/**
 * Admin order list filter — a 5-way status distinct from the raw `orders.status` 4-value enum
 * (`ORDER_STATUS` in `constants/subscription.ts`). Every order starts `status: "pending"`, and
 * `orders.status` only ever moves forward from there (see `utils/order-status.ts`'s transition
 * table) — nothing sets it back, and payment approval/rejection only touches `payment_status`,
 * not `status`. That means a huge share of an order's life is spent sitting at
 * `status: "pending"` in two very different real states: freshly placed and genuinely awaiting
 * payment review (`payment_status: "pending"`), or payment already resolved one way or another
 * (`payment_status: "paid"`/`"failed"`) but fulfillment hasn't been progressed yet. Splitting
 * "Payment Review" out of "Pending" here (see `getAdminOrderFilterStatus`) keeps those two states
 * from being invisible inside one catch-all tab.
 */
export const ADMIN_ORDER_FILTER_STATUSES = ["pending", "payment_review", "processing", "completed", "cancelled"] as const;

export type AdminOrderFilterStatus = (typeof ADMIN_ORDER_FILTER_STATUSES)[number];

export const ADMIN_ORDER_FILTER_STATUS_LABEL: Record<AdminOrderFilterStatus, string> = {
  pending: "Pending",
  payment_review: "Payment Review",
  processing: "Processing",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const ORDER_ACTIVITY_ACTION_LABEL: Record<OrderActivityAction, string> = {
  order_created: "Order created",
  payment_submitted: "Payment submitted",
  payment_approved: "Payment approved",
  payment_rejected: "Payment rejected",
  order_processing: "Order processing",
  subscription_delivered: "Subscription delivered",
  order_completed: "Order completed",
  order_cancelled: "Order cancelled",
  coupon_applied: "Coupon applied",
};
