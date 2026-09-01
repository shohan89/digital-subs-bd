export type SubscriptionActivityAction =
  | "subscription_created"
  | "subscription_extended"
  | "expiry_changed"
  | "subscription_cancelled"
  | "subscription_reactivated"
  | "delivery_updated";

/** Staff-only — `subscription_activity`'s RLS has no customer-readable policy, mirroring
 * `order_activity`'s decision (see that table's migration). Never surface this type (or a query
 * against it) on a customer-facing page; customers see subscription status via `SubscriptionCard`
 * (derived from `expiry_date`/`status` directly) only. */
export type SubscriptionActivity = {
  id: string;
  subscriptionId: string;
  actorId: string | null;
  /** Snapshot at write time, not a live join — same reasoning as `OrderActivity.actorName`. Never
   * `null` here in practice: unlike `order_activity`'s customer-triggered events, every
   * subscription-activity action originates from a staff member (including the
   * `subscription_created` entry `approve_payment()` logs — the approving staff member is the
   * actor for the whole transaction). */
  actorName: string | null;
  action: SubscriptionActivityAction;
  oldValue: string | null;
  newValue: string | null;
  note: string | null;
  createdAt: string;
};
