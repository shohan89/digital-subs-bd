import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SUBSCRIPTION_STATUS_BADGE_VARIANT } from "@/constants/status-badges";
import { SUBSCRIPTION_STATUS_LABEL } from "@/constants/subscription";
import { ROUTES } from "@/constants/routes";
import { formatDate } from "@/utils/format-date";
import { getSubscriptionStatus } from "@/utils/subscription";
import type { Subscription } from "@/types/subscription";

/**
 * Subscriptions `approve_payment()` provisioned for *this* order specifically, via `subscriptions
 * .order_id` (added in `20260831000300_add_subscription_management.sql`) — a real link, fetched
 * with `subscriptionsService.listSubscriptionsForOrder`, not a best-effort product-id match
 * against the customer's full subscription list the way this used to work before that column
 * existed.
 */
export function OrderSubscriptionsCard({ subscriptions }: { subscriptions: Subscription[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription information</CardTitle>
      </CardHeader>
      <CardContent>
        {subscriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No subscription has been provisioned for this order yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border/60">
            {subscriptions.map((subscription) => {
              const status = getSubscriptionStatus(subscription.expiryDate, subscription.status === "cancelled");
              return (
                <li key={subscription.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 flex-col">
                    <Link href={ROUTES.adminSubscriptionDetail(subscription.id)} className="truncate text-sm font-medium hover:underline">
                      {subscription.product?.name ?? "Unknown product"}
                    </Link>
                    <span className="text-xs text-muted-foreground">Expires {formatDate(subscription.expiryDate)}</span>
                  </div>
                  <Badge variant={SUBSCRIPTION_STATUS_BADGE_VARIANT[status]} className="shrink-0">
                    {SUBSCRIPTION_STATUS_LABEL[status]}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
