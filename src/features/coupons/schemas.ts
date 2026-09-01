import { z } from "zod";

import { ADMIN_COUPON_SORTS, ADMIN_COUPON_STATUS_FILTERS, DISCOUNT_TYPES } from "@/constants/coupons";

// Every scalar coupon field. `code` is normalized to uppercase/trimmed on submit so
// "save10"/"SAVE10" can't end up looking like two different codes in the admin list —
// `getCouponByCode`'s lookup is case-insensitive regardless, this just keeps storage consistent.
// `startDate`/`expiryDate` are plain `<input type="date">` strings ("YYYY-MM-DD"), converted to a
// full ISO timestamp in the action, same pattern as `setSubscriptionExpirySchema.expiryDate`.
const couponFields = {
  code: z
    .string()
    .min(3, "Code is too short")
    .max(40, "Code is too long")
    .regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, - or _ only")
    .transform((value) => value.trim().toUpperCase()),
  discountType: z.enum(DISCOUNT_TYPES),
  discountValue: z.number().min(0, "Must be 0 or more"),
  minOrderAmount: z.number().min(0, "Must be 0 or more").optional(),
  maxDiscount: z.number().min(0, "Must be 0 or more").optional(),
  startDate: z.string().min(1).optional(),
  expiryDate: z.string().min(1).optional(),
  usageLimit: z.number().int().min(1, "Must be 1 or more").optional(),
  perUserUsageLimit: z.number().int().min(1, "Must be 1 or more").optional(),
  isActive: z.boolean().default(true),
};

// Cross-field checks (percentage discount capped at 100, start date before expiry date) — both
// also backed by real Postgres check constraints on `coupons`
// (`coupons_date_range_check`/the original table's percentage check), so an update that somehow
// bypasses this schema-level refine (see `updateCouponSchema` below, which can't reuse these
// refines against partial data) still can't reach the database in a bad state; `updateCouponAction`
// maps that constraint violation (`23514`) to a friendly fallback message.
export const createCouponSchema = z
  .object(couponFields)
  .refine((data) => data.discountType !== "percentage" || data.discountValue <= 100, {
    message: "A percentage discount can't exceed 100",
    path: ["discountValue"],
  })
  .refine((data) => !data.startDate || !data.expiryDate || data.startDate <= data.expiryDate, {
    message: "Start date must be before expiry date",
    path: ["expiryDate"],
  });

export type CreateCouponInput = z.infer<typeof createCouponSchema>;

// No cross-field `.refine()` here — `z.object(...).partial()` needs a plain (non-`ZodEffects`)
// object schema, and a partial update can legitimately touch only one side of either cross-field
// rule (e.g. flipping `isActive` alone). The database's own check constraints are the real
// backstop for both rules on this path — see the comment above `createCouponSchema`.
export const updateCouponSchema = z.object(couponFields).partial().extend({ id: z.string().uuid() });

export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;

export const adminCouponFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(ADMIN_COUPON_STATUS_FILTERS).optional(),
  sort: z.enum(ADMIN_COUPON_SORTS).optional(),
});

export type AdminCouponFilters = z.infer<typeof adminCouponFiltersSchema>;

export const validateCouponSchema = z.object({
  code: z.string().min(1),
  subtotal: z.number().min(0),
});

export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;
