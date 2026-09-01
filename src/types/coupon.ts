import type { DiscountType } from "@/constants/coupons";

export type Coupon = {
  id: string;
  code: string;
  discountType: DiscountType;
  /** A percentage (0–100) for `discountType === "percentage"`, or a flat currency amount for
   * `"fixed"` — the DB's own check constraint (`coupons_discount_value_check` /
   * `discount_type <> 'percentage' or discount_value <= 100`) enforces the 0–100 bound only for
   * percentage coupons. */
  discountValue: number;
  /** Null = no minimum order amount required. */
  minOrderAmount: number | null;
  /** Null = the computed discount is never capped (only meaningful for `"percentage"`, but
   * applied uniformly regardless of type — see `couponsService.computeDiscount`). */
  maxDiscount: number | null;
  /** Null = active immediately, no start restriction. */
  startDate: string | null;
  /** Null = never expires. */
  expiryDate: string | null;
  /** Null = unlimited total redemptions. */
  usageLimit: number | null;
  /** Null = unlimited redemptions per customer. */
  perUserUsageLimit: number | null;
  /** Manual admin on/off switch — independent of `expiryDate`; see that column's check on the
   * table and `getCouponStatus`'s doc comment for how the two combine into one display status. */
  isActive: boolean;
  /** Total successful redemptions so far — only incremented atomically inside `redeem_coupon()`,
   * never written directly by any service/action code. */
  usedCount: number;
  createdAt: string;
  updatedAt: string;
};
