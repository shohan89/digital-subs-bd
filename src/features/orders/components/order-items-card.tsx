import Image from "next/image";
import { Package } from "lucide-react";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/format-currency";
import type { Order } from "@/types/order";

export function OrderItemsCard({ order }: { order: Order }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Order items</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y divide-border/60">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                {item.product?.image ? (
                  <Image src={item.product.image} alt="" width={40} height={40} className="size-full object-cover" />
                ) : (
                  <Package className="size-4 text-muted-foreground" aria-hidden="true" />
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{item.product?.name ?? "Unknown product"}</span>
                <span className="text-xs text-muted-foreground">
                  {formatCurrency(item.price)} × {item.quantity}
                </span>
              </div>
              <span className="shrink-0 text-sm font-medium">{formatCurrency(item.price * item.quantity)}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-1.5">
        {order.discountAmount > 0 && (
          <>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatCurrency(order.totalAmount + order.discountAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</span>
              <span>-{formatCurrency(order.discountAmount)}</span>
            </div>
          </>
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Total</span>
          <span className="text-base font-semibold">{formatCurrency(order.totalAmount)}</span>
        </div>
      </CardFooter>
    </Card>
  );
}
