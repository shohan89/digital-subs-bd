import type { ReviewStatus } from "@/constants/reviews";
import type { CategoryStatus } from "@/constants/categories";
import type { CouponDisplayStatus } from "@/constants/coupons";
import type { ProductStatus } from "@/constants/products";
import type { OrderStatus, PaymentRecordStatus, PaymentStatus, SubscriptionStatus } from "@/constants/subscription";
import type { UserRole } from "@/types/user";

/** `Badge`'s `variant` prop, mapped per status — shared across every place a status renders as a
 * badge (order tracking, dashboard orders/subscriptions, ...) so the color semantics can't drift
 * between them (e.g. "expired" reading as a warning color in one place and an error color in another). */
export const ORDER_STATUS_BADGE_VARIANT: Record<OrderStatus, "default" | "outline" | "destructive"> = {
  pending: "outline",
  processing: "default",
  completed: "default",
  cancelled: "destructive",
};

export const PAYMENT_STATUS_BADGE_VARIANT: Record<PaymentStatus, "default" | "outline" | "destructive" | "secondary"> = {
  pending: "outline",
  paid: "default",
  failed: "destructive",
  refunded: "secondary",
};

/** `payments.status` (one payment record's manual-verification state) — distinct from
 * `PAYMENT_STATUS_BADGE_VARIANT` above, which is `orders.payment_status` (the order's overall
 * payment state). Different enums (`verified` here vs `paid` there), same visual language. */
export const PAYMENT_RECORD_STATUS_BADGE_VARIANT: Record<PaymentRecordStatus, "default" | "outline" | "destructive" | "secondary"> = {
  pending: "outline",
  verified: "default",
  rejected: "destructive",
  refunded: "secondary",
};

export const SUBSCRIPTION_STATUS_BADGE_VARIANT: Record<SubscriptionStatus, "default" | "outline" | "destructive"> = {
  active: "default",
  expiring_soon: "outline",
  expired: "destructive",
  cancelled: "destructive",
};

export const REVIEW_STATUS_BADGE_VARIANT: Record<ReviewStatus, "default" | "outline" | "destructive"> = {
  pending: "outline",
  approved: "default",
  hidden: "destructive",
};

export const PRODUCT_STATUS_BADGE_VARIANT: Record<ProductStatus, "default" | "outline" | "secondary"> = {
  draft: "outline",
  active: "default",
  archived: "secondary",
};

export const CATEGORY_STATUS_BADGE_VARIANT: Record<CategoryStatus, "default" | "secondary"> = {
  active: "default",
  inactive: "secondary",
};

export const USER_ROLE_BADGE_VARIANT: Record<UserRole, "default" | "outline" | "secondary"> = {
  customer: "outline",
  manager: "secondary",
  admin: "default",
};

export const COUPON_DISPLAY_STATUS_BADGE_VARIANT: Record<CouponDisplayStatus, "default" | "outline" | "destructive" | "secondary"> = {
  active: "default",
  scheduled: "outline",
  expired: "destructive",
  limit_reached: "destructive",
  inactive: "secondary",
};
