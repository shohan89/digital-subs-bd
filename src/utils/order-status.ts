import type { AdminOrderFilterStatus } from "@/constants/orders";
import type { OrderStatus, PaymentStatus } from "@/constants/subscription";

/** `orders.status` only ever moves forward — nothing in this app transitions it backwards.
 * `completed`/`cancelled` are terminal; `cancelled` is reachable from either non-terminal state. */
const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["processing", "completed", "cancelled"],
  processing: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

/** Moving *into* `processing`/`completed` requires a verified payment — an order can't start
 * (or finish) fulfillment on a payment that's still pending review or was rejected. Cancelling
 * has no such requirement: a pending/processing order can always be cancelled regardless of
 * payment state. */
const REQUIRES_PAID_PAYMENT: Partial<Record<OrderStatus, true>> = { processing: true, completed: true };

/** Every status this order could legally move to right now, given its current fulfillment status
 * and payment status. Used both to validate an actual transition server-side and to decide which
 * admin action buttons to render (never render a button for a transition that would be rejected). */
export function getValidNextStatuses(currentStatus: OrderStatus, paymentStatus: PaymentStatus): OrderStatus[] {
  const candidates = ORDER_STATUS_TRANSITIONS[currentStatus] ?? [];
  return candidates.filter((next) => !REQUIRES_PAID_PAYMENT[next] || paymentStatus === "paid");
}

export function isValidOrderStatusTransition(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus,
  paymentStatus: PaymentStatus,
): boolean {
  return getValidNextStatuses(currentStatus, paymentStatus).includes(nextStatus);
}

/** See the doc comment on `ADMIN_ORDER_FILTER_STATUSES` for the reasoning behind splitting
 * "Payment Review" out of "Pending" instead of treating them as the same bucket. */
export function getAdminOrderFilterStatus(status: OrderStatus, paymentStatus: PaymentStatus): AdminOrderFilterStatus {
  if (status === "cancelled") return "cancelled";
  if (status === "completed") return "completed";
  if (status === "processing") return "processing";
  return paymentStatus === "pending" ? "payment_review" : "pending";
}
