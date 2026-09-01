/** One redemption record — staff-only (`coupon_usages`' RLS mirrors `coupons`' own admin-only
 * policy), never rendered on a customer-facing page. */
export type CouponUsage = {
  id: string;
  couponId: string;
  userId: string;
  orderId: string;
  discountAmount: number;
  createdAt: string;
};
