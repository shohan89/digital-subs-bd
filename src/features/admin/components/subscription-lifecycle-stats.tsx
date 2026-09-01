import { AlertTriangle, CalendarClock, XCircle } from "lucide-react";

import { StatCard } from "@/features/admin/components/stat-card";
import type { SubscriptionLifecycleCounts } from "@/services/subscriptions.service";

/**
 * Three counts, all computed from `expiry_date` directly via Bangladesh-calendar-day cutoffs
 * (`subscriptionsService.getSubscriptionLifecycleCounts`) — not `admin_dashboard_stats()`'s old
 * `expiring_soon_subscriptions` field, which always read `0` (see that field's removal migration).
 * "Within 3 days"/"within 7 days" are cumulative, not a mutually-exclusive bucket — see
 * `SubscriptionLifecycleCounts`'s doc comment.
 */
export function SubscriptionLifecycleStats({ counts }: { counts: SubscriptionLifecycleCounts }) {
  const cards = [
    { label: "Expiring Within 3 Days", value: counts.expiringWithin3Days.toLocaleString(), icon: AlertTriangle },
    { label: "Expiring Within 7 Days", value: counts.expiringWithin7Days.toLocaleString(), icon: CalendarClock },
    { label: "Expired Subscriptions", value: counts.expired.toLocaleString(), icon: XCircle },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {cards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  );
}
