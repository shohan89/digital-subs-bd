import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/constants/routes";
import { formatDate } from "@/utils/format-date";
import type { Subscription } from "@/types/subscription";

export function SubscriptionInfoCard({ subscription }: { subscription: Subscription }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription details</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Customer</dt>
            <dd className="font-medium">{subscription.customerName ?? "—"}</dd>
            <dd className="text-sm text-muted-foreground">{subscription.customerEmail ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Product</dt>
            <dd className="font-medium">{subscription.product?.name ?? "Unknown product"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Start date</dt>
            <dd className="font-medium">{formatDate(subscription.startDate)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Expiry date</dt>
            <dd className="font-medium">{formatDate(subscription.expiryDate)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Order</dt>
            <dd>
              {subscription.orderId ? (
                <Link href={ROUTES.adminOrderDetail(subscription.orderId)} className="font-mono text-sm text-primary hover:underline">
                  {subscription.orderId.slice(0, 8)}
                </Link>
              ) : (
                <span className="text-sm text-muted-foreground">Not linked to an order</span>
              )}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
