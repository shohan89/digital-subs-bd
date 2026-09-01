"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { Package, Tag, X } from "lucide-react";

import { validateCouponAction } from "@/actions/coupons.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { formatCurrency } from "@/utils/format-currency";
import type { CartItem } from "@/types/cart";

export type AppliedCoupon = { code: string; discountAmount: number };

type CheckoutOrderSummaryProps = {
  items: CartItem[];
  subtotal: number;
  /** Notified whenever a coupon is successfully applied/removed, so `CheckoutForm` can include the
   * code in what it actually submits. This component only ever shows a *preview* — see
   * `validateCouponAction`'s doc comment for why the real order never trusts this number. */
  onCouponChange: (coupon: AppliedCoupon | null) => void;
};

/** Read-only line-item list + total, plus a coupon-code field. Unlike `CartLineItem`, no quantity/
 * remove controls: editing the cart mid-checkout belongs on `/cart`, not this step. */
export function CheckoutOrderSummary({ items, subtotal, onCouponChange }: CheckoutOrderSummaryProps) {
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplying, startApplyTransition] = useTransition();

  function applyCoupon() {
    if (!couponInput.trim()) return;
    setCouponError(null);
    startApplyTransition(async () => {
      const result = await validateCouponAction({ code: couponInput.trim(), subtotal });
      if (!result.success) {
        setCouponError(result.error);
        return;
      }
      const coupon = { code: result.data.code, discountAmount: result.data.discountAmount };
      setAppliedCoupon(coupon);
      onCouponChange(coupon);
    });
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
    onCouponChange(null);
  }

  const total = subtotal - (appliedCoupon?.discountAmount ?? 0);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/60 p-5">
      <h2 className="font-heading text-base font-medium">Order summary</h2>

      <div className="flex flex-col gap-3 divide-y divide-border/60">
        {items.map((item) => (
          <div key={`${item.productId}-${item.variantId}`} className="flex items-center gap-3 pt-3 first:pt-0">
            <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
              {item.image ? (
                <Image src={item.image} alt="" fill sizes="48px" className="object-cover" />
              ) : (
                <Package className="size-5 text-muted-foreground" aria-hidden="true" />
              )}
            </div>
            <div className="flex flex-1 flex-col">
              <span className="text-sm font-medium">{item.name}</span>
              <span className="text-xs text-muted-foreground">
                {item.variantName ? `${item.variantName} · ` : ""}Qty {item.quantity}
              </span>
            </div>
            <span className="text-sm font-medium">{formatCurrency(item.price * item.quantity)}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 border-t border-border/60 pt-4">
        {appliedCoupon ? (
          <div className="flex items-center justify-between gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm">
            <span className="flex items-center gap-1.5 font-medium text-primary">
              <Tag className="size-3.5" aria-hidden="true" />
              {appliedCoupon.code} applied
            </span>
            <button type="button" onClick={removeCoupon} className="text-muted-foreground hover:text-foreground" aria-label="Remove coupon">
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              value={couponInput}
              onChange={(event) => setCouponInput(event.target.value)}
              placeholder="Coupon code"
              aria-label="Coupon code"
              disabled={isApplying}
              className="h-9 flex-1"
            />
            <Button type="button" variant="outline" size="sm" onClick={applyCoupon} disabled={isApplying || !couponInput.trim()}>
              {isApplying && <LoadingSpinner size="sm" className="text-current" />}
              Apply
            </Button>
          </div>
        )}
        {couponError && <p className="text-sm text-destructive">{couponError}</p>}
      </div>

      <div className="flex flex-col gap-1.5 border-t border-border/60 pt-4 text-sm">
        {appliedCoupon && (
          <>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Discount</span>
              <span>-{formatCurrency(appliedCoupon.discountAmount)}</span>
            </div>
          </>
        )}
        <div className="flex items-center justify-between">
          <span className="font-medium">Total</span>
          <span className="text-base font-semibold">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}
