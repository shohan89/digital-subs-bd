import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ORDER_STATUS_BADGE_VARIANT } from "@/constants/status-badges";
import { ORDER_STATUS_LABEL } from "@/constants/subscription";
import { ROUTES } from "@/constants/routes";
import { formatCurrency } from "@/utils/format-currency";
import { formatRelativeTime } from "@/utils/format-date";
import type { Order } from "@/types/order";

export function RecentOrdersSection({ orders }: { orders: Order[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent orders</CardTitle>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href={ROUTES.adminOrders}>View all</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="text-right">Placed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{order.customerName}</span>
                        <span className="text-xs text-muted-foreground">{order.customerEmail}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ORDER_STATUS_BADGE_VARIANT[order.status]}>{ORDER_STATUS_LABEL[order.status]}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatRelativeTime(order.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
