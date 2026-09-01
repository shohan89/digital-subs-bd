import { Package } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import {
  ORDER_STATUS_BADGE_VARIANT,
  PAYMENT_STATUS_BADGE_VARIANT,
  SUBSCRIPTION_STATUS_BADGE_VARIANT,
} from "@/constants/status-badges";
import { ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, SUBSCRIPTION_STATUS_LABEL } from "@/constants/subscription";
import { OrderStatusTimeline } from "@/features/order-tracking/components/order-status-timeline";
import { buildOrderSupportMessage } from "@/utils/whatsapp";
import { formatCurrency } from "@/utils/format-currency";
import { formatDate } from "@/utils/format-date";
import { getSubscriptionStatus } from "@/utils/subscription";
import type { OrderTrackingResult } from "@/types/order-tracking";

export function OrderTrackingResultView({
  result,
  whatsappNumber,
  storeName,
}: {
  result: OrderTrackingResult;
  whatsappNumber: string;
  storeName: string;
}) {
  const { order, payment, subscriptions, timeline } = result;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Order {order.id.slice(0, 8)}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Placed {formatDate(order.createdAt, "d MMM yyyy")}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={ORDER_STATUS_BADGE_VARIANT[order.status]}>{ORDER_STATUS_LABEL[order.status]}</Badge>
              <Badge variant={PAYMENT_STATUS_BADGE_VARIANT[order.paymentStatus]}>
                Payment: {PAYMENT_STATUS_LABEL[order.paymentStatus]}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <OrderStatusTimeline steps={timeline} />

          <Separator />

          <div className="flex flex-col divide-y divide-border/60">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Package className="size-4 text-muted-foreground" aria-hidden="true" />
                </div>
                <div className="flex flex-1 flex-col">
                  <span className="text-sm font-medium">{item.product?.name ?? "Product"}</span>
                  <span className="text-xs text-muted-foreground">Qty {item.quantity}</span>
                </div>
                <span className="text-sm font-medium">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-border/60 pt-4">
            <span className="font-medium">Total</span>
            <span className="text-base font-semibold">{formatCurrency(order.totalAmount)}</span>
          </div>

          {payment && (
            <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
              Paid via {PAYMENT_METHOD_LABEL[payment.method]} · Transaction ID{" "}
              <span className="font-mono text-xs">{payment.transactionId}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscription status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border/60">
          {subscriptions.map((item) => {
            // Derived from `expiryDate`, not the stored `status` column — nothing currently
            // transitions a subscription to expiring_soon/expired automatically (see
            // `getSubscriptionStatus`'s doc comment), so the stored value can be stale.
            const status = item.subscription
              ? getSubscriptionStatus(item.subscription.expiryDate, item.subscription.status === "cancelled")
              : null;
            return (
              <div key={item.productId} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <span className="text-sm font-medium">{item.productName}</span>
                {item.subscription && status ? (
                  <div className="flex flex-col items-end gap-0.5">
                    <Badge variant={SUBSCRIPTION_STATUS_BADGE_VARIANT[status]}>{SUBSCRIPTION_STATUS_LABEL[status]}</Badge>
                    <span className="text-xs text-muted-foreground">
                      Until {formatDate(item.subscription.expiryDate, "d MMM yyyy")}
                    </span>
                  </div>
                ) : (
                  <Badge variant="outline">Not yet active</Badge>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <WhatsAppButton
          phoneNumber={whatsappNumber}
          message={buildOrderSupportMessage(order.id, storeName)}
          variant="outline"
          label="Get help with this order"
        />
      </div>
    </div>
  );
}
