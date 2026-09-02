import { Ban, CalendarClock, CalendarPlus, KeyRound, PackagePlus, RotateCcw } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { SUBSCRIPTION_ACTIVITY_ACTION_LABEL } from "@/constants/subscriptions";
import { formatDate } from "@/utils/format-date";
import type { SubscriptionActivity, SubscriptionActivityAction } from "@/types/subscription-activity";

const ACTIVITY_ICON: Record<SubscriptionActivityAction, typeof PackagePlus> = {
  subscription_created: PackagePlus,
  subscription_extended: CalendarPlus,
  expiry_changed: CalendarClock,
  subscription_cancelled: Ban,
  subscription_reactivated: RotateCcw,
  delivery_updated: KeyRound,
};

function describeActivity(activity: SubscriptionActivity): string {
  const by = activity.actorName ? ` by ${activity.actorName}` : "";
  switch (activity.action) {
    case "subscription_created":
      return `Subscription created${by}`;
    case "subscription_extended":
      return `Extended${by}${activity.note ? ` (${activity.note})` : ""}`;
    case "expiry_changed":
      return `Expiry date changed${by}`;
    case "subscription_cancelled":
      return `Cancelled${by}`;
    case "subscription_reactivated":
      return `Reactivated${by}`;
    case "delivery_updated":
      return `Delivery information updated${by}`;
  }
}

/**
 * Staff-only display — only ever mounted on `/admin/subscriptions/[id]`, itself gated by
 * `requireStaff()`, and `subscriptionActivityService.listActivityForSubscription` reads a table
 * with no customer-readable RLS policy. Never render this on a customer-facing page — customers
 * see subscription status via `SubscriptionCard`'s derived badge only.
 */
export function SubscriptionTimelineCard({ activity }: { activity: SubscriptionActivity[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription history</CardTitle>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <EmptyState message="No activity recorded yet." />
        ) : (
          <ol className="flex flex-col gap-5">
            {activity.map((entry) => {
              const Icon = ACTIVITY_ICON[entry.action];
              return (
                <li key={entry.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon className="size-3.5" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5 pb-0.5">
                    <span className="text-sm font-medium">{SUBSCRIPTION_ACTIVITY_ACTION_LABEL[entry.action]}</span>
                    <span className="text-sm text-muted-foreground">{describeActivity(entry)}</span>
                    {(entry.action === "subscription_extended" || entry.action === "expiry_changed") &&
                      entry.oldValue &&
                      entry.newValue && (
                        <span className="text-xs text-muted-foreground">
                          {formatDate(entry.oldValue)} &rarr; {formatDate(entry.newValue)}
                        </span>
                      )}
                    {entry.action !== "subscription_extended" && entry.note && (
                      <span className="text-sm text-muted-foreground italic">&ldquo;{entry.note}&rdquo;</span>
                    )}
                    <span className="text-xs text-muted-foreground">{formatDate(entry.createdAt, "d MMM yyyy, h:mm a")}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
