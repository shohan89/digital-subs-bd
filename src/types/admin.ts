import type { OrderStatus } from "@/constants/subscription";

/** One row from `admin_dashboard_stats()` (see the analytics migration) — a single Postgres
 * round-trip for every headline number the dashboard needs, instead of N separate count queries
 * plus a client-side reduce for revenue. No expiring/expired subscription counts here on purpose —
 * see `subscriptionsService.getSubscriptionLifecycleCounts` and
 * `SubscriptionLifecycleStats` instead; this function used to have an
 * `expiring_soon_subscriptions` column, removed because it counted a `subscriptions.status` value
 * (`'expiring_soon'`) nothing in this app ever actually writes. */
export type AdminDashboardStats = {
  totalRevenue: number;
  totalOrders: number;
  orderStatusCounts: Record<OrderStatus, number>;
  activeSubscriptions: number;
  totalCustomers: number;
  pendingPaymentsCount: number;
  pendingReviewsCount: number;
};

/** One point in a revenue time series — `date` is an ISO date string (`"2026-08-01"`), day- or
 * month-granularity depending on which `admin_revenue_*` function produced it. */
export type RevenuePoint = { date: string; revenue: number };

export type RevenueRange = "7d" | "30d" | "90d" | "all";

/** All four ranges pre-fetched together (`adminService.getRevenueSeries`) so switching the
 * "Revenue analytics" range toggle is an instant client-side swap, not a new server round-trip. */
export type RevenueSeriesByRange = Record<RevenueRange, RevenuePoint[]>;

/** One row from `admin_top_products()` — revenue/quantity aggregated from paid orders only. */
export type TopProduct = {
  productId: string;
  name: string;
  slug: string;
  image: string | null;
  totalQuantity: number;
  totalRevenue: number;
};
