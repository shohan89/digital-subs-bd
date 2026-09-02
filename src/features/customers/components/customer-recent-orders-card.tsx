import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ORDER_STATUS_BADGE_VARIANT, PAYMENT_STATUS_BADGE_VARIANT } from "@/constants/status-badges";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/constants/subscription";
import { ROUTES } from "@/constants/routes";
import { formatCurrency } from "@/utils/format-currency";
import { formatDate } from "@/utils/format-date";
import type { Order } from "@/types/order";

/** Links each row to the *admin* order detail (`/admin/orders/[id]`), not
 * `/checkout/confirmation/[orderId]` the way `OrderListItem` does on the customer's own
 * `/dashboard/orders` — that page is scoped to the signed-in user's own orders, so an admin
 * viewing a different customer's order there wouldn't resolve correctly. */
export function CustomerRecentOrdersCard({ orders }: { orders: Order[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent orders</CardTitle>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <EmptyState message="No orders yet." />
        ) : (
          <ul className="flex flex-col divide-y divide-border/60">
            {orders.map((order) => (
              <li key={order.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex min-w-0 flex-col gap-1">
                  <Link href={ROUTES.adminOrderDetail(order.id)} className="font-mono text-xs text-primary hover:underline">
                    {order.id.slice(0, 8)}
                  </Link>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={ORDER_STATUS_BADGE_VARIANT[order.status]}>{ORDER_STATUS_LABEL[order.status]}</Badge>
                    <Badge variant={PAYMENT_STATUS_BADGE_VARIANT[order.paymentStatus]}>{PAYMENT_STATUS_LABEL[order.paymentStatus]}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(order.createdAt, "d MMM yyyy")}</span>
                </div>
                <span className="shrink-0 text-sm font-semibold">{formatCurrency(order.totalAmount)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
