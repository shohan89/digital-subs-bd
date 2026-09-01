import {
  AlertTriangle,
  CreditCard,
  MessageSquare,
  PackageCheck,
  ShoppingBag,
  Star,
  XCircle,
  type LucideIcon,
} from "lucide-react";

/** Matches `notifications_type_check` in `20260901000700_add_notification_center.sql` exactly —
 * update both together. Recipient (customer vs. staff) isn't encoded here; it's just whichever
 * `user_id` a row was inserted for. `subscription_expiring` is the one type sent to both a
 * customer (about their own subscription) and every staff member (as "Subscription expiring" in
 * the admin notification list) — same type, two different recipients, not two types. */
export const NOTIFICATION_TYPES = [
  "order_received",
  "payment_submitted",
  "payment_approved",
  "payment_rejected",
  "subscription_delivered",
  "subscription_expiring",
  "subscription_expired",
  "review_published",
  "review_hidden",
  "new_order",
  "new_payment_submission",
  "new_review",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_TYPE_ICON: Record<NotificationType, LucideIcon> = {
  order_received: ShoppingBag,
  payment_submitted: CreditCard,
  payment_approved: CreditCard,
  payment_rejected: XCircle,
  subscription_delivered: PackageCheck,
  subscription_expiring: AlertTriangle,
  subscription_expired: AlertTriangle,
  review_published: Star,
  review_hidden: Star,
  new_order: ShoppingBag,
  new_payment_submission: CreditCard,
  new_review: MessageSquare,
};
