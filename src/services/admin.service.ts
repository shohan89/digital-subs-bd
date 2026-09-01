import type { DbClient } from "@/services/types";
import type { AdminDashboardStats, RevenuePoint, RevenueSeriesByRange, TopProduct } from "@/types/admin";
import type { UserRole } from "@/types/user";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw row shape, DbClient is untyped until database.types.ts is generated (see comment there)
function mapDashboardStatsRow(row: any): AdminDashboardStats {
  return {
    totalRevenue: Number(row.total_revenue),
    totalOrders: Number(row.total_orders),
    orderStatusCounts: {
      pending: Number(row.pending_orders),
      processing: Number(row.processing_orders),
      completed: Number(row.completed_orders),
      cancelled: Number(row.cancelled_orders),
    },
    activeSubscriptions: Number(row.active_subscriptions),
    totalCustomers: Number(row.total_customers),
    pendingPaymentsCount: Number(row.pending_payments),
    pendingReviewsCount: Number(row.pending_reviews),
  };
}

/** One round-trip for every headline number on `/admin/dashboard` — see
 * `admin_dashboard_stats()` in `supabase/migrations/20260830000100_add_admin_dashboard_analytics.sql`
 * for why this is a `security definer` Postgres function rather than N queries run under RLS. */
export async function getDashboardStats(db: DbClient): Promise<AdminDashboardStats> {
  const { data, error } = await db.rpc("admin_dashboard_stats");
  if (error) throw error;
  const row = data?.[0];
  if (!row) throw new Error("admin_dashboard_stats() returned no row");
  return mapDashboardStatsRow(row);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
function mapRevenuePoint(row: any, dateKey: "day" | "month"): RevenuePoint {
  return { date: row[dateKey], revenue: Number(row.revenue) };
}

/**
 * Pre-fetches all four "Revenue analytics" ranges in parallel so the client-side range toggle is
 * an instant swap between already-loaded arrays, not a new server round-trip per click.
 */
export async function getRevenueSeries(db: DbClient): Promise<RevenueSeriesByRange> {
  const [daily7, daily30, daily90, monthly] = await Promise.all([
    db.rpc("admin_revenue_daily", { p_days: 7 }),
    db.rpc("admin_revenue_daily", { p_days: 30 }),
    db.rpc("admin_revenue_daily", { p_days: 90 }),
    db.rpc("admin_revenue_monthly"),
  ]);

  for (const result of [daily7, daily30, daily90, monthly]) {
    if (result.error) throw result.error;
  }

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw row shape, see mapRevenuePoint
    "7d": (daily7.data ?? []).map((row: any) => mapRevenuePoint(row, "day")),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
    "30d": (daily30.data ?? []).map((row: any) => mapRevenuePoint(row, "day")),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
    "90d": (daily90.data ?? []).map((row: any) => mapRevenuePoint(row, "day")),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
    all: (monthly.data ?? []).map((row: any) => mapRevenuePoint(row, "month")),
  };
}

export async function getTopProducts(db: DbClient, limit = 5): Promise<TopProduct[]> {
  const { data, error } = await db.rpc("admin_top_products", { p_limit: limit });
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
  return (data ?? []).map((row: any) => ({
    productId: row.product_id,
    name: row.name,
    slug: row.slug,
    image: row.image,
    totalQuantity: Number(row.total_quantity),
    totalRevenue: Number(row.total_revenue),
  }));
}

export async function updateUserRole(db: DbClient, userId: string, role: UserRole) {
  const { data, error } = await db.from("profiles").update({ role }).eq("id", userId).select().single();
  if (error) throw error;
  return data;
}
