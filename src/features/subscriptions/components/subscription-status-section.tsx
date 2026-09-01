import { SubscriptionCard } from "@/features/subscriptions/components/subscription-card";
import type { SubscriptionDelivery } from "@/types/subscription-delivery";
import type { Subscription } from "@/types/subscription";

type SubscriptionStatusSectionProps = {
  title: string;
  subscriptions: Subscription[];
  deliveries: Record<string, SubscriptionDelivery>;
};

/** One titled group of subscription cards — `/dashboard/subscriptions` renders one of these per
 * computed status bucket (`groupSubscriptionsByStatus`), skipping empty buckets entirely rather
 * than rendering a "0 subscriptions" heading. */
export function SubscriptionStatusSection({ title, subscriptions, deliveries }: SubscriptionStatusSectionProps) {
  if (subscriptions.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        {title}
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">{subscriptions.length}</span>
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subscriptions.map((subscription) => (
          <SubscriptionCard key={subscription.id} subscription={subscription} delivery={deliveries[subscription.id]} />
        ))}
      </div>
    </section>
  );
}
