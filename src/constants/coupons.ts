export const DISCOUNT_TYPES = ["percentage", "fixed"] as const;

export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const DISCOUNT_TYPE_LABEL: Record<DiscountType, string> = {
  percentage: "Percentage",
  fixed: "Fixed amount",
};

// Admin list filter — mirrors the stored `is_active` column directly, same shape as
// `CATEGORY_STATUSES`. Not the same thing as `CouponDisplayStatus` below (a coupon can be
// `is_active: true` and still show as "Expired"/"Scheduled" for display purposes).
export const ADMIN_COUPON_STATUS_FILTERS = ["active", "inactive"] as const;

export type AdminCouponStatusFilter = (typeof ADMIN_COUPON_STATUS_FILTERS)[number];

export const ADMIN_COUPON_STATUS_FILTER_LABEL: Record<AdminCouponStatusFilter, string> = {
  active: "Active",
  inactive: "Inactive",
};

export const ADMIN_COUPON_SORTS = ["newest", "oldest", "code_asc", "expiry_asc"] as const;

export type AdminCouponSort = (typeof ADMIN_COUPON_SORTS)[number];

export const ADMIN_COUPON_SORT_LABEL: Record<AdminCouponSort, string> = {
  newest: "Newest",
  oldest: "Oldest",
  code_asc: "Code (A–Z)",
  expiry_asc: "Expiry (soonest)",
};

/** Computed (not stored) display status — combines `is_active`, `start_date`/`expiry_date`, and
 * `usage_limit`/`used_count` into one badge, the same "derive at render time, never store it"
 * philosophy as `getSubscriptionStatus`. See `utils/coupon.ts`'s `getCouponStatus`. */
export const COUPON_DISPLAY_STATUSES = ["active", "scheduled", "expired", "limit_reached", "inactive"] as const;

export type CouponDisplayStatus = (typeof COUPON_DISPLAY_STATUSES)[number];

export const COUPON_DISPLAY_STATUS_LABEL: Record<CouponDisplayStatus, string> = {
  active: "Active",
  scheduled: "Scheduled",
  expired: "Expired",
  limit_reached: "Limit reached",
  inactive: "Inactive",
};
