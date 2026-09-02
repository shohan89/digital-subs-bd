import Link from "next/link";
import { CreditCard, ImageOff, ImageUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PAYMENT_RECORD_STATUS_BADGE_VARIANT } from "@/constants/status-badges";
import { PAYMENT_METHOD_LABEL, PAYMENT_RECORD_STATUS_LABEL } from "@/constants/subscription";
import { ROUTES } from "@/constants/routes";
import { AdminPaymentRowActions } from "@/features/payments/components/admin-payment-row-actions";
import { formatCurrency } from "@/utils/format-currency";
import { formatDate } from "@/utils/format-date";
import type { PaymentWithOrder } from "@/types/payment";

export function AdminPaymentTable({ payments }: { payments: PaymentWithOrder[] }) {
  if (payments.length === 0) {
    return <EmptyState icon={CreditCard} message="No payments match this filter." />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Payment ID</TableHead>
            <TableHead>Order ID</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Transaction ID</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Screenshot</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell className="font-mono text-xs">{payment.id.slice(0, 8)}</TableCell>
              <TableCell>
                <Link href={ROUTES.adminOrderDetail(payment.order.id)} className="font-mono text-xs text-primary hover:underline">
                  {payment.order.id.slice(0, 8)}
                </Link>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{payment.order.customerName}</span>
                  <span className="text-xs text-muted-foreground">{payment.order.customerEmail}</span>
                </div>
              </TableCell>
              <TableCell>{PAYMENT_METHOD_LABEL[payment.method]}</TableCell>
              <TableCell className="font-mono text-xs">{payment.transactionId ?? "—"}</TableCell>
              <TableCell>{formatCurrency(payment.order.totalAmount)}</TableCell>
              <TableCell>
                {payment.screenshot ? (
                  <ImageUp className="size-4 text-muted-foreground" aria-label="Screenshot submitted" />
                ) : (
                  <ImageOff className="size-4 text-muted-foreground" aria-label="No screenshot" />
                )}
              </TableCell>
              <TableCell>
                <Badge variant={PAYMENT_RECORD_STATUS_BADGE_VARIANT[payment.status]}>{PAYMENT_RECORD_STATUS_LABEL[payment.status]}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDate(payment.createdAt)}</TableCell>
              <TableCell>
                <AdminPaymentRowActions payment={payment} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
