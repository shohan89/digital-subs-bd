import type { SubscriptionStatus } from "@/constants/subscription";

export type Subscription = {
  id: string;
  userId: string;
  productId: string;
  /** Nullable — set automatically by `approve_payment()` for a checkout-provisioned subscription,
   * left `null` for one an admin creates manually (comp access, migrated customer, ...). */
  orderId: string | null;
  /** Snapshot taken at creation time (from `orders.customer_name`/`customer_email` for an
   * auto-provisioned subscription, or resolved via `find_customer_by_email` for a manually
   * created one) — not a live join to `profiles`, same reasoning as `orders.customer_name`/
   * `customer_email` (`profiles` only grants `is_admin()` read, not `is_staff()`; a manager's
   * session joining it directly would silently get nulls back). Can go stale if the customer
   * later changes their name/email — acceptable, matches the established `orders` precedent. */
  customerName: string | null;
  customerEmail: string | null;
  status: SubscriptionStatus;
  startDate: string;
  expiryDate: string;
  createdAt: string;
  updatedAt: string;
  /** Joined from `products` for display — `null` only if the product row itself is gone, which
   * `products.id`'s `on delete restrict` FK should prevent while any subscription references it. */
  product: { name: string; slug: string; image: string | null } | null;
};
