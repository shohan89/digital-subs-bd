import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PAYMENT_METHOD_LABEL } from "@/constants/subscription";
import { ROUTES } from "@/constants/routes";
import { formatCurrency } from "@/utils/format-currency";
import { formatRelativeTime } from "@/utils/format-date";
import type { PaymentWithOrder } from "@/types/payment";

export function PendingPaymentsSection({ payments }: { payments: PaymentWithOrder[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending payments</CardTitle>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href={ROUTES.adminPayments}>Review all</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nothing awaiting verification.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border/60">
            {payments.map((payment) => (
              <li key={payment.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">{payment.order.customerName}</span>
                  <span className="text-xs text-muted-foreground">
                    {PAYMENT_METHOD_LABEL[payment.method]} · {formatRelativeTime(payment.createdAt)}
                  </span>
                </div>
                <span className="shrink-0 text-sm font-medium">{formatCurrency(payment.order.totalAmount)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
