import type { Metadata } from "next";
import { notFound, unstable_rethrow } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { SUBSCRIPTION_STATUS_BADGE_VARIANT } from "@/constants/status-badges";
import { SUBSCRIPTION_STATUS_LABEL } from "@/constants/subscription";
import {
  SubscriptionDeliveryCard,
  SubscriptionInfoCard,
  SubscriptionStatusActions,
  SubscriptionTimelineCard,
} from "@/features/subscriptions/components";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { subscriptionActivityService, subscriptionDeliveryService, subscriptionsService } from "@/services";
import { getSubscriptionStatus } from "@/utils/subscription";
import type { Subscription } from "@/types/subscription";
import type { SubscriptionActivity } from "@/types/subscription-activity";
import type { SubscriptionDelivery } from "@/types/subscription-delivery";

type SubscriptionDetailPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = { title: "Subscription Details" };

type SubscriptionDetailData = {
  subscription: Subscription;
  delivery: SubscriptionDelivery | null;
  activity: SubscriptionActivity[];
};

async function getSubscriptionDetail(subscriptionId: string): Promise<SubscriptionDetailData | null> {
  const supabase = await createServerSupabaseClient();

  const subscription = await subscriptionsService.getSubscriptionById(supabase, subscriptionId);
  if (!subscription) return null;

  const [delivery, activity] = await Promise.all([
    subscriptionDeliveryService.getDeliveryForSubscription(supabase, subscriptionId),
    subscriptionActivityService.listActivityForSubscription(supabase, subscriptionId),
  ]);

  return { subscription, delivery, activity };
}

export default async function SubscriptionDetailPage({ params }: SubscriptionDetailPageProps) {
  const { id } = await params;

  let data: SubscriptionDetailData | null;
  try {
    data = await getSubscriptionDetail(id);
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to load subscription detail", error);
    return (
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <Alert variant="destructive">
          <AlertDescription>Couldn&apos;t load this subscription right now. Please try again shortly.</AlertDescription>
        </Alert>
      </main>
    );
  }

  if (!data) notFound();
  const { subscription, delivery, activity } = data;
  const status = getSubscriptionStatus(subscription.expiryDate, subscription.status === "cancelled");

  return (
    <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-lg font-semibold">Subscription {subscription.id.slice(0, 8)}</h1>
            <Badge variant={SUBSCRIPTION_STATUS_BADGE_VARIANT[status]}>{SUBSCRIPTION_STATUS_LABEL[status]}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{subscription.product?.name ?? "Unknown product"}</p>
        </div>

        <SubscriptionStatusActions subscription={subscription} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <SubscriptionInfoCard subscription={subscription} />
          <SubscriptionTimelineCard activity={activity} />
        </div>

        <div className="flex flex-col gap-6">
          <SubscriptionDeliveryCard subscriptionId={subscription.id} delivery={delivery} />
        </div>
      </div>
    </main>
  );
}
