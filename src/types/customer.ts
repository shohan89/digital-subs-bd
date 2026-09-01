import type { UserRole } from "@/types/user";

/**
 * `/admin/customers` view of a `profiles` row — every field here is safe to render on an admin
 * page: it comes straight from `profiles` (itself `is_admin()`-only RLS), never from a raw
 * `auth.admin.*` response. Never widen this type to carry a raw Supabase Auth `User` object
 * (`identities`, `app_metadata`, `banned_until`, etc.) — see
 * `customersService.setCustomerDisabled`'s doc comment for why that API is only ever touched
 * write-side, never read back and passed through to a page.
 */
export type Customer = {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: UserRole;
  disabled: boolean;
  createdAt: string;
};

export type CustomerStats = {
  /** Every order regardless of payment/fulfillment status — matches `admin_dashboard_stats()`'s
   * unfiltered `total_orders` count. */
  totalOrders: number;
  /** Sum of `total_amount` for `payment_status = 'paid'` orders only — matches
   * `admin_dashboard_stats()`'s `total_revenue` definition, so a customer's "Total spending" here
   * means the same thing the dashboard's global revenue figure does. */
  totalSpending: number;
  activeSubscriptions: number;
  /** Computed the same way `getSubscriptionStatus`/`listSubscriptionsForAdmin`'s "expired" filter
   * do (`expiry_date` in the past and not cancelled) — never `.eq("status", "expired")`, since
   * `subscriptions.status` never actually stores that value. */
  expiredSubscriptions: number;
};
