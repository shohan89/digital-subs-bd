import { Ban, CheckCheck, CheckCircle2, CreditCard, PackageCheck, RefreshCw, ShoppingBag, Tag, XCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ORDER_ACTIVITY_ACTION_LABEL } from "@/constants/orders";
import { formatDate } from "@/utils/format-date";
import type { OrderActivity, OrderActivityAction } from "@/types/order-activity";

const ACTIVITY_ICON: Record<OrderActivityAction, typeof ShoppingBag> = {
  order_created: ShoppingBag,
  payment_submitted: CreditCard,
  payment_approved: CheckCircle2,
  payment_rejected: XCircle,
  order_processing: RefreshCw,
  subscription_delivered: PackageCheck,
  order_completed: CheckCheck,
  order_cancelled: Ban,
  coupon_applied: Tag,
};

function describeActivity(activity: OrderActivity): string {
  const by = activity.actorName ? ` by ${activity.actorName}` : "";
  switch (activity.action) {
    case "order_created":
      return "Order placed by customer";
    case "payment_submitted":
      return "Payment submitted by customer, awaiting review";
    case "payment_approved":
      return `Payment approved${by}`;
    case "payment_rejected":
      return `Payment rejected${by}`;
    case "order_processing":
      return `Order moved to processing${by}`;
    case "subscription_delivered":
      return `Subscription provisioned${by}`;
    case "order_completed":
      return `Order marked completed${by}`;
    case "order_cancelled":
      return `Order cancelled${by}`;
    case "coupon_applied":
      return "Coupon applied to this order";
  }
}

/**
 * Staff-only display — this card is only ever mounted on `/admin/orders/[id]`, which is itself
 * gated by `requireStaff()` via the `(admin)` layout, and `orderActivityService.listActivityForOrder`
 * reads a table with no customer-readable RLS policy (see that table's migration). Never render
 * this (or fetch `OrderActivity[]`) from a customer-facing page — customers see order status via
 * the existing `orders.status`/`payment_status` badges only, not this internal audit trail.
 */
export function OrderTimelineCard({ activity }: { activity: OrderActivity[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Order timeline</CardTitle>
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
                    <span className="text-sm font-medium">{ORDER_ACTIVITY_ACTION_LABEL[entry.action]}</span>
                    <span className="text-sm text-muted-foreground">{describeActivity(entry)}</span>
                    {entry.note && <span className="text-sm text-muted-foreground italic">&ldquo;{entry.note}&rdquo;</span>}
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
