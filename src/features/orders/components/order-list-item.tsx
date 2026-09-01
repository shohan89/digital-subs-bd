import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ORDER_STATUS_BADGE_VARIANT, PAYMENT_STATUS_BADGE_VARIANT } from "@/constants/status-badges";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/constants/subscription";
import { ROUTES } from "@/constants/routes";
import { formatCurrency } from "@/utils/format-currency";
import { formatDate } from "@/utils/format-date";
import type { Order } from "@/types/order";

/** One row in `/dashboard/orders` — links to `/checkout/confirmation/[orderId]` as the order's
 * detail view rather than building a second, near-identical detail page (that page is already
 * accessible to the order's own owner: same RLS-scoped read, same data). */
export function OrderListItem({ order }: { order: Order }) {
  const itemsSummary = order.items.map((item) => item.product?.name ?? "Product").join(", ");

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">Order {order.id.slice(0, 8)}</span>
          <Badge variant={ORDER_STATUS_BADGE_VARIANT[order.status]}>{ORDER_STATUS_LABEL[order.status]}</Badge>
          <Badge variant={PAYMENT_STATUS_BADGE_VARIANT[order.paymentStatus]}>
            Payment: {PAYMENT_STATUS_LABEL[order.paymentStatus]}
          </Badge>
        </div>
        <p className="text-sm">{itemsSummary}</p>
        <p className="text-xs text-muted-foreground">{formatDate(order.createdAt, "d MMM yyyy")}</p>
      </div>

      <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-2">
        <span className="text-base font-semibold">{formatCurrency(order.totalAmount)}</span>
        <Button asChild variant="outline" size="sm">
          <Link href={ROUTES.checkoutConfirmation(order.id)}>View details</Link>
        </Button>
      </div>
    </div>
  );
}
