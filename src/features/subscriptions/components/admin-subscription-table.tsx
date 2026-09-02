import Link from "next/link";
import { RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { SUBSCRIPTION_STATUS_BADGE_VARIANT } from "@/constants/status-badges";
import { SUBSCRIPTION_STATUS_LABEL } from "@/constants/subscription";
import { ROUTES } from "@/constants/routes";
import { formatDate } from "@/utils/format-date";
import { daysUntilExpiry, getSubscriptionStatus } from "@/utils/subscription";
import type { Subscription } from "@/types/subscription";

function DaysRemaining({ expiryDate, cancelled }: { expiryDate: string; cancelled: boolean }) {
  if (cancelled) return <span className="text-muted-foreground">—</span>;
  const days = daysUntilExpiry(expiryDate);
  if (days < 0) return <span className="text-destructive">Expired {Math.abs(days)}d ago</span>;
  return <span>{days}d</span>;
}

export function AdminSubscriptionTable({ subscriptions }: { subscriptions: Subscription[] }) {
  if (subscriptions.length === 0) {
    return <EmptyState icon={RefreshCw} message="No subscriptions match your filters." />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Start date</TableHead>
            <TableHead>Expiry date</TableHead>
            <TableHead>Days remaining</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Order</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subscriptions.map((subscription) => {
            const status = getSubscriptionStatus(subscription.expiryDate, subscription.status === "cancelled");
            return (
              <TableRow key={subscription.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{subscription.customerName ?? "—"}</span>
                    <span className="text-xs text-muted-foreground">{subscription.customerEmail ?? "—"}</span>
                  </div>
                </TableCell>
                <TableCell className="max-w-40 truncate">{subscription.product?.name ?? "Unknown product"}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(subscription.startDate)}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(subscription.expiryDate)}</TableCell>
                <TableCell>
                  <DaysRemaining expiryDate={subscription.expiryDate} cancelled={subscription.status === "cancelled"} />
                </TableCell>
                <TableCell>
                  <Badge variant={SUBSCRIPTION_STATUS_BADGE_VARIANT[status]}>{SUBSCRIPTION_STATUS_LABEL[status]}</Badge>
                </TableCell>
                <TableCell>
                  {subscription.orderId ? (
                    <Link href={ROUTES.adminOrderDetail(subscription.orderId)} className="font-mono text-xs text-primary hover:underline">
                      {subscription.orderId.slice(0, 8)}
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Link href={ROUTES.adminSubscriptionDetail(subscription.id)} className="text-sm text-primary hover:underline">
                    Manage
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
