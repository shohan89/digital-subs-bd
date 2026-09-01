import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ORDER_STATUS_BADGE_VARIANT, PAYMENT_STATUS_BADGE_VARIANT } from "@/constants/status-badges";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/constants/subscription";
import { ROUTES } from "@/constants/routes";
import { formatCurrency } from "@/utils/format-currency";
import { formatRelativeTime } from "@/utils/format-date";
import type { Order } from "@/types/order";

function summarizeItems(order: Order): string {
  if (order.items.length === 0) return "—";
  const names = order.items.map((item) => item.product?.name ?? "Unknown product");
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
}

export function AdminOrderTable({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
        No orders match your filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Products</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Placed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell>
                <Link href={ROUTES.adminOrderDetail(order.id)} className="font-mono text-xs text-primary hover:underline">
                  {order.id.slice(0, 8)}
                </Link>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{order.customerName}</span>
                  <span className="text-xs text-muted-foreground">{order.customerEmail}</span>
                </div>
              </TableCell>
              <TableCell className="max-w-52 truncate text-muted-foreground">{summarizeItems(order)}</TableCell>
              <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
              <TableCell>
                <Badge variant={PAYMENT_STATUS_BADGE_VARIANT[order.paymentStatus]}>{PAYMENT_STATUS_LABEL[order.paymentStatus]}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={ORDER_STATUS_BADGE_VARIANT[order.status]}>{ORDER_STATUS_LABEL[order.status]}</Badge>
              </TableCell>
              <TableCell className="text-right text-muted-foreground">{formatRelativeTime(order.createdAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
