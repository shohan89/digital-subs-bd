import type { CouponDisplayStatus } from "@/constants/coupons";
import type { Coupon } from "@/types/coupon";

/**
 * Derives one display status from `is_active` + `start_date`/`expiry_date` + `usage_limit`/
 * `used_count` — precedence matters: an inactive coupon shows "Inactive" even if it would
 * otherwise be within its date range, and an expired coupon shows "Expired" even if `is_active`
 * is still `true` (the admin simply hasn't gotten around to flipping it off — `is_active`
 * doesn't auto-clear on expiry, matching `getSubscriptionStatus`'s "nothing transitions this
 * automatically" precedent for `subscriptions.status`).
 */
export function getCouponStatus(coupon: Pick<Coupon, "isActive" | "startDate" | "expiryDate" | "usageLimit" | "usedCount">): CouponDisplayStatus {
  if (!coupon.isActive) return "inactive";

  const now = new Date();
  if (coupon.expiryDate && new Date(coupon.expiryDate) < now) return "expired";
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) return "limit_reached";
  if (coupon.startDate && new Date(coupon.startDate) > now) return "scheduled";

  return "active";
}
