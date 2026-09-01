export type OrderActivityAction =
  | "order_created"
  | "payment_submitted"
  | "payment_approved"
  | "payment_rejected"
  | "order_processing"
  | "subscription_delivered"
  | "order_completed"
  | "order_cancelled"
  | "coupon_applied";

/** Staff-only — see `order_activity`'s migration for why this dropped the customer-readable
 * "view own" policy the sibling order tables have. Never surface this type (or a query against
 * it) on a customer-facing page; customers see order status via `orders.status`/`payment_status`
 * only, through the existing badges. */
export type OrderActivity = {
  id: string;
  orderId: string;
  actorId: string | null;
  /** Snapshot at write time, not a live join — see the migration's doc comment for why. `null`
   * for customer-triggered events (`order_created`, `payment_submitted`) — no staff actor. */
  actorName: string | null;
  action: OrderActivityAction;
  oldStatus: string | null;
  newStatus: string | null;
  note: string | null;
  createdAt: string;
};
