import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SUBSCRIPTION_STATUS_BADGE_VARIANT } from "@/constants/status-badges";
import { SUBSCRIPTION_STATUS_LABEL } from "@/constants/subscription";
import { ROUTES } from "@/constants/routes";
import { daysUntilExpiry, getSubscriptionStatus } from "@/utils/subscription";
import type { Subscription } from "@/types/subscription";

export function ExpiringSubscriptionsSection({ subscriptions }: { subscriptions: Subscription[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Expiring subscriptions</CardTitle>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href={ROUTES.adminSubscriptions}>View all</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {subscriptions.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nothing expiring in the next 7 days.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border/60">
            {subscriptions.map((subscription) => {
              // Never trust `subscriptions.status` directly for display — nothing transitions it
              // on its own (no cron/scheduled function), so it can be stale indefinitely.
              const status = getSubscriptionStatus(subscription.expiryDate, subscription.status === "cancelled");
              const daysLeft = daysUntilExpiry(subscription.expiryDate);
              return (
                <li key={subscription.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{subscription.product?.name ?? "Unknown product"}</span>
                    <span className="text-xs text-muted-foreground">
                      {daysLeft <= 0 ? "Expires today" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}
                    </span>
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
