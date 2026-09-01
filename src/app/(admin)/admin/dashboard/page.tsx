import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";
import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  DashboardCharts,
  DashboardStatsGrid,
  ExpiringSubscriptionsSection,
  PendingPaymentsSection,
  RecentOrdersSection,
  SubscriptionLifecycleStats,
  TopProductsSection,
} from "@/features/admin/components";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { adminService, notificationsService, ordersService, paymentsService, subscriptionsService } from "@/services";
import type { SubscriptionLifecycleCounts } from "@/services/subscriptions.service";
import type { AdminDashboardStats, RevenueSeriesByRange, TopProduct } from "@/types/admin";
import type { Order } from "@/types/order";
import type { PaymentWithOrder } from "@/types/payment";
import type { Subscription } from "@/types/subscription";

export const metadata: Metadata = { title: "Admin Dashboard" };

type DashboardOverview = {
  stats: AdminDashboardStats;
  revenueSeries: RevenueSeriesByRange;
  topProducts: TopProduct[];
  recentOrders: Order[];
  pendingPayments: PaymentWithOrder[];
  expiringSubscriptions: Subscription[];
  subscriptionLifecycle: SubscriptionLifecycleCounts;
};

/** Every query below runs through the caller's own session-scoped client (not service-role) —
 * the `admin_*` Postgres functions each do their own `is_staff()` guard (see
 * `supabase/migrations/20260830000100_add_admin_dashboard_analytics.sql`), and the plain table
 * reads (`listRecentOrders`/`listPendingPayments`/`listExpiringSubscriptions`) are already covered
 * by each table's `is_staff()` RLS policy. One `Promise.all` fires every query concurrently, so
 * total wall-clock is roughly the slowest single query, not their sum. */
async function getDashboardOverview(): Promise<DashboardOverview> {
  const supabase = await createServerSupabaseClient();

  const [stats, revenueSeries, topProducts, recentOrders, pendingPayments, expiringSubscriptions, subscriptionLifecycle] = await Promise.all([
    adminService.getDashboardStats(supabase),
    adminService.getRevenueSeries(supabase),
    adminService.getTopProducts(supabase, 5),
    ordersService.listRecentOrders(supabase, 8),
    paymentsService.listPendingPayments(supabase, 5),
    subscriptionsService.listExpiringSubscriptions(supabase, 7, 5),
    subscriptionsService.getSubscriptionLifecycleCounts(supabase),
  ]);

  return { stats, revenueSeries, topProducts, recentOrders, pendingPayments, expiringSubscriptions, subscriptionLifecycle };
}

export default async function AdminDashboardPage() {
  let overview: DashboardOverview;
  try {
    overview = await getDashboardOverview();
  } catch (error) {
    // Next's own control-flow signals (dynamic-usage bailout during static-generation probing,
    // redirect(), notFound()) come through as thrown errors too — rethrow those so Next still
    // handles them instead of this catch swallowing them into a fake "data fetch failed" state.
    unstable_rethrow(error);
    console.error("Failed to load admin dashboard overview", error);
    return (
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Couldn&apos;t load the dashboard</AlertTitle>
          <AlertDescription>Something went wrong fetching the latest data. Refresh the page to try again.</AlertDescription>
        </Alert>
      </main>
    );
  }

  const { stats, revenueSeries, topProducts, recentOrders, pendingPayments, expiringSubscriptions, subscriptionLifecycle } = overview;

  // Opportunistic sync, same as the customer dashboard pages — sweeps every active subscription
  // (no `userId` scope) since this is the staff-facing trigger point. Deliberately the
  // service-role client, not the caller's own staff session: `notifyStaff` needs to read every
  // staff member's `profiles` row, and `profiles` SELECT is `is_admin()`-only, not `is_staff()` —
  // a manager's session here would silently see an empty staff list and under-notify. Awaited,
  // not fire-and-forget — see the customer dashboard's comment for why (Cloudflare/OpenNext).
  try {
    await notificationsService.syncSubscriptionLifecycleNotifications(createAdminClient());
  } catch (error) {
    console.error("Failed to sync subscription lifecycle notifications", error);
  }

  return (
    <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Live overview of orders, payments, subscriptions, and revenue.</p>
      </div>

      <DashboardStatsGrid stats={stats} />

      <DashboardCharts revenueSeries={revenueSeries} orderStatusCounts={stats.orderStatusCounts} />

      <RecentOrdersSection orders={recentOrders} />

      <SubscriptionLifecycleStats counts={subscriptionLifecycle} />

      <div className="grid gap-4 lg:grid-cols-2">
        <PendingPaymentsSection payments={pendingPayments} />
        <ExpiringSubscriptionsSection subscriptions={expiringSubscriptions} />
      </div>

      <TopProductsSection products={topProducts} />
    </main>
  );
}
