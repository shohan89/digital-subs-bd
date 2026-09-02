import type { Metadata } from "next";
import { PackageOpen } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { SUBSCRIPTION_STATUS_LABEL } from "@/constants/subscription";
import { SubscriptionStatusSection } from "@/features/subscriptions/components";
import { requireUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notificationsService, subscriptionDeliveryService, subscriptionsService } from "@/services";
import { groupSubscriptionsByStatus } from "@/utils/subscription";

export const metadata: Metadata = { title: "Your Subscriptions" };

export default async function DashboardSubscriptionsPage() {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();
  const subscriptions = await subscriptionsService.listSubscriptionsForUser(supabase, user.id);
  const deliveries = await subscriptionDeliveryService.listDeliveriesForSubscriptions(
    supabase,
    subscriptions.map((subscription) => subscription.id),
  );

  // Same opportunistic sync as `/dashboard` — see that page's comment for why this needs the
  // service-role client and why it's awaited rather than fire-and-forget.
  try {
    await notificationsService.syncSubscriptionLifecycleNotifications(createAdminClient(), { userId: user.id });
  } catch (error) {
    console.error("Failed to sync subscription lifecycle notifications", error);
  }

  // Active/Expiring Soon/Expired/Cancelled, computed fresh on every render (`getSubscriptionStatus`)
  // — never a stored status, so this grouping is always accurate regardless of when a subscription
  // was last written to. Sections render in this fixed order and skip entirely when empty (see
  // `SubscriptionStatusSection`), so a customer with only active subscriptions never sees empty
  // "Expiring Soon"/"Expired" headings.
  const grouped = groupSubscriptionsByStatus(subscriptions);

  return (
    <main className="flex-1 p-8">
      <h1 className="text-xl font-semibold">Your subscriptions</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {subscriptions.length} subscription{subscriptions.length === 1 ? "" : "s"}
      </p>

      {subscriptions.length === 0 ? (
        <EmptyState icon={PackageOpen} message="No subscriptions yet." className="mt-8" />
      ) : (
        <div className="mt-6 flex flex-col gap-8">
          <SubscriptionStatusSection title={SUBSCRIPTION_STATUS_LABEL.active} subscriptions={grouped.active} deliveries={deliveries} />
          <SubscriptionStatusSection
            title={SUBSCRIPTION_STATUS_LABEL.expiring_soon}
            subscriptions={grouped.expiring_soon}
            deliveries={deliveries}
          />
          <SubscriptionStatusSection title={SUBSCRIPTION_STATUS_LABEL.expired} subscriptions={grouped.expired} deliveries={deliveries} />
          <SubscriptionStatusSection title={SUBSCRIPTION_STATUS_LABEL.cancelled} subscriptions={grouped.cancelled} deliveries={deliveries} />
        </div>
      )}
    </main>
  );
}
