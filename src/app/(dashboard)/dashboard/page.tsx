import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CreditCard, PackageCheck, ShoppingBag } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { ROUTES } from "@/constants/routes";
import { OrderListItem } from "@/features/orders/components";
import { SubscriptionCard } from "@/features/subscriptions/components";
import { requireUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notificationsService, ordersService, subscriptionsService } from "@/services";
import { getSubscriptionStatus } from "@/utils/subscription";

export const metadata: Metadata = { title: "Dashboard" };

const RECENT_ORDERS_LIMIT = 3;
const ACTIVE_SUBSCRIPTIONS_PREVIEW_LIMIT = 3;

export default async function DashboardOverviewPage() {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();

  const [orders, subscriptions] = await Promise.all([
    ordersService.listOrdersForUser(supabase, user.id),
    subscriptionsService.listSubscriptionsForUser(supabase, user.id),
  ]);

  // Opportunistic — there's no cron job anywhere in this app to detect an expiring/expired
  // subscription on its own (see `syncSubscriptionLifecycleNotifications`'s doc comment), so a
  // dashboard visit is what triggers the check. Needs the service-role client regardless of the
  // page's own session — customers have no INSERT policy on `notifications` at all, even for
  // themselves. Awaited (not fire-and-forget) — this app deploys to Cloudflare via OpenNext,
  // where a response can end the invocation before an un-awaited promise gets to finish. Non-
  // fatal: a sync failure shouldn't break the dashboard itself.
  try {
    await notificationsService.syncSubscriptionLifecycleNotifications(createAdminClient(), { userId: user.id });
  } catch (error) {
    console.error("Failed to sync subscription lifecycle notifications", error);
  }

  // Derived from `expiryDate`, not the stored `status` column — see `getSubscriptionStatus`'s doc
  // comment for why nothing here trusts that column to already reflect expiry on its own.
  const withDerivedStatus = subscriptions.map((subscription) => ({
    subscription,
    status: getSubscriptionStatus(subscription.expiryDate, subscription.status === "cancelled"),
  }));
  const activeSubscriptions = withDerivedStatus.filter(({ status }) => status === "active" || status === "expiring_soon");
  const expiringOrExpired = withDerivedStatus.filter(({ status }) => status === "expiring_soon" || status === "expired");

  return (
    <main className="flex-1 p-8">
      <h1 className="text-xl font-semibold">Welcome{user.fullName ? `, ${user.fullName}` : ""}</h1>

      {expiringOrExpired.length > 0 && (
        <Alert variant="destructive" className="mt-6">
          <AlertTriangle />
          <AlertTitle>
            {expiringOrExpired.length} subscription{expiringOrExpired.length === 1 ? "" : "s"} need
            {expiringOrExpired.length === 1 ? "s" : ""} attention
          </AlertTitle>
          <AlertDescription>
            {expiringOrExpired
              .map(({ subscription, status }) =>
                status === "expired"
                  ? `${subscription.product?.name ?? "A subscription"} has expired.`
                  : `${subscription.product?.name ?? "A subscription"} expires soon.`,
              )
              .join(" ")}{" "}
            <Link href={ROUTES.dashboardSubscriptions} className="underline underline-offset-4">
              Review your subscriptions
            </Link>
            .
          </AlertDescription>
        </Alert>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PackageCheck className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active subscriptions</p>
              <p className="text-lg font-semibold">{activeSubscriptions.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShoppingBag className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total orders</p>
              <p className="text-lg font-semibold">{orders.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CreditCard className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending payments</p>
              <p className="text-lg font-semibold">{orders.filter((order) => order.paymentStatus === "pending").length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold">Active subscriptions</h2>
          {subscriptions.length > 0 && (
            <Link href={ROUTES.dashboardSubscriptions} className="text-sm text-primary hover:underline">
              View all
            </Link>
          )}
        </div>
        {subscriptions.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No subscriptions yet.</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subscriptions.slice(0, ACTIVE_SUBSCRIPTIONS_PREVIEW_LIMIT).map((subscription) => (
              <SubscriptionCard key={subscription.id} subscription={subscription} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold">Recent orders</h2>
          {orders.length > 0 && (
            <Link href={ROUTES.dashboardOrders} className="text-sm text-primary hover:underline">
              View all
            </Link>
          )}
        </div>
        {orders.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {orders.slice(0, RECENT_ORDERS_LIMIT).map((order) => (
              <OrderListItem key={order.id} order={order} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
