import Image from "next/image";
import { AlertTriangle, KeyRound, Package } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { SUBSCRIPTION_STATUS_BADGE_VARIANT } from "@/constants/status-badges";
import { SUBSCRIPTION_STATUS_LABEL } from "@/constants/subscription";
import { cn } from "@/lib/utils";
import { formatDate } from "@/utils/format-date";
import { daysUntilExpiry, getSubscriptionStatus } from "@/utils/subscription";
import type { Subscription } from "@/types/subscription";
import type { SubscriptionDelivery } from "@/types/subscription-delivery";

/** Product name, start date, expiry date, days remaining — plus the "expiry warning system": a
 * derived (not stored) status drives an amber/red treatment for subscriptions expiring soon or
 * already expired, since nothing currently transitions `subscriptions.status` on its own (see
 * `getSubscriptionStatus`'s doc comment).
 *
 * `delivery` (optional — omitted entirely if staff hasn't provisioned it yet) renders the account
 * access credentials a staff member entered on `/admin/subscriptions/[id]`. Safe to render here:
 * `subscription_deliveries`' RLS grants the owning customer "view own" read access precisely so
 * this page (never a public one) can show it — see that table's migration comment for the "no
 * public pages" reasoning this satisfies. */
export function SubscriptionCard({ subscription, delivery }: { subscription: Subscription; delivery?: SubscriptionDelivery | null }) {
  const status = getSubscriptionStatus(subscription.expiryDate, subscription.status === "cancelled");
  const daysLeft = daysUntilExpiry(subscription.expiryDate);
  const isWarning = status === "expiring_soon" || status === "expired";

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border p-5",
        status === "expired"
          ? "border-destructive/30 bg-destructive/5"
          : status === "expiring_soon"
            ? "border-accent/40 bg-accent/5"
            : "border-border/60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
            {subscription.product?.image ? (
              <Image src={subscription.product.image} alt="" fill sizes="44px" className="object-cover" />
            ) : (
              <Package className="size-5 text-muted-foreground" aria-hidden="true" />
            )}
          </div>
          <div>
            <p className="font-medium">{subscription.product?.name ?? "Product"}</p>
            <Badge variant={SUBSCRIPTION_STATUS_BADGE_VARIANT[status]} className="mt-1">
              {SUBSCRIPTION_STATUS_LABEL[status]}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Start date</p>
          <p className="font-medium">{formatDate(subscription.startDate)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Expiry date</p>
          <p className="font-medium">{formatDate(subscription.expiryDate)}</p>
        </div>
      </div>

      <div
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
          status === "expired"
            ? "bg-destructive/10 text-destructive"
            : status === "expiring_soon"
              ? "bg-accent/15 text-accent-foreground"
              : "bg-muted/60 text-muted-foreground",
        )}
      >
        {isWarning && <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />}
        {status === "expired"
          ? `Expired ${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"} ago`
          : status === "cancelled"
            ? "Cancelled"
            : `${daysLeft} day${daysLeft === 1 ? "" : "s"} remaining`}
      </div>

      {delivery && (delivery.accountEmail || delivery.accountUsername || delivery.accessInstructions || delivery.profileInfo) && (
        <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <KeyRound className="size-3.5" aria-hidden="true" />
            Access details
          </p>
          {delivery.accountEmail && (
            <p>
              <span className="text-muted-foreground">Email: </span>
              <span className="font-mono">{delivery.accountEmail}</span>
            </p>
          )}
          {delivery.accountUsername && (
            <p>
              <span className="text-muted-foreground">Username: </span>
              <span className="font-mono">{delivery.accountUsername}</span>
            </p>
          )}
          {delivery.profileInfo && (
            <p>
              <span className="text-muted-foreground">Profile: </span>
              {delivery.profileInfo}
            </p>
          )}
          {delivery.accessInstructions && <p className="whitespace-pre-wrap text-muted-foreground">{delivery.accessInstructions}</p>}
        </div>
      )}
    </div>
  );
}
