import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { COUPON_DISPLAY_STATUS_BADGE_VARIANT } from "@/constants/status-badges";
import { COUPON_DISPLAY_STATUS_LABEL, DISCOUNT_TYPE_LABEL } from "@/constants/coupons";
import { AdminCouponRowActions } from "@/features/coupons/components/admin-coupon-row-actions";
import { formatCurrency } from "@/utils/format-currency";
import { formatDate } from "@/utils/format-date";
import { getCouponStatus } from "@/utils/coupon";
import type { Coupon } from "@/types/coupon";

function formatDiscount(coupon: Coupon): string {
  return coupon.discountType === "percentage" ? `${coupon.discountValue}%` : formatCurrency(coupon.discountValue);
}

function formatUsage(coupon: Coupon): string {
  return coupon.usageLimit !== null ? `${coupon.usedCount} / ${coupon.usageLimit}` : `${coupon.usedCount} / ∞`;
}

export function AdminCouponTable({ coupons }: { coupons: Coupon[] }) {
  if (coupons.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
        No coupons match your filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Discount</TableHead>
            <TableHead>Min. order</TableHead>
            <TableHead>Usage</TableHead>
            <TableHead>Expiry</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {coupons.map((coupon) => {
            const status = getCouponStatus(coupon);
            return (
              <TableRow key={coupon.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-mono text-sm font-medium">{coupon.code}</span>
                    <span className="text-xs text-muted-foreground">{DISCOUNT_TYPE_LABEL[coupon.discountType]}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {formatDiscount(coupon)}
                  {coupon.maxDiscount !== null && (
                    <span className="block text-xs text-muted-foreground">up to {formatCurrency(coupon.maxDiscount)}</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {coupon.minOrderAmount !== null ? formatCurrency(coupon.minOrderAmount) : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">{formatUsage(coupon)}</TableCell>
                <TableCell className="text-muted-foreground">{coupon.expiryDate ? formatDate(coupon.expiryDate) : "Never"}</TableCell>
                <TableCell>
                  <Badge variant={COUPON_DISPLAY_STATUS_BADGE_VARIANT[status]}>{COUPON_DISPLAY_STATUS_LABEL[status]}</Badge>
                </TableCell>
                <TableCell>
                  <AdminCouponRowActions coupon={coupon} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
