import type { AdminCouponFilters, CreateCouponInput, UpdateCouponInput } from "@/features/coupons/schemas";
import type { DbClient } from "@/services/types";
import type { Coupon } from "@/types/coupon";
import { formatCurrency } from "@/utils/format-currency";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw row shape, DbClient is untyped until database.types.ts is generated (see comment there)
function mapCoupon(row: any): Coupon {
  return {
    id: row.id,
    code: row.code,
    discountType: row.discount_type,
    discountValue: Number(row.discount_value),
    minOrderAmount: row.min_order_amount !== null ? Number(row.min_order_amount) : null,
    maxDiscount: row.max_discount !== null ? Number(row.max_discount) : null,
    startDate: row.start_date,
    expiryDate: row.expiry_date,
    usageLimit: row.usage_limit,
    perUserUsageLimit: row.per_user_usage_limit,
    isActive: row.is_active,
    usedCount: row.used_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Admin coupon list — search by code, filter by `is_active`, sort. No pagination, same reasoning
 * as `listCategoriesForAdmin`: this store's coupon count stays small enough that one page is fine. */
export async function listCouponsForAdmin(db: DbClient, filters: AdminCouponFilters = {}): Promise<Coupon[]> {
  let query = db.from("coupons").select("*");

  if (filters.status === "active") query = query.eq("is_active", true);
  else if (filters.status === "inactive") query = query.eq("is_active", false);

  if (filters.search) query = query.ilike("code", `%${filters.search}%`);

  switch (filters.sort) {
    case "oldest":
      query = query.order("created_at", { ascending: true });
      break;
    case "code_asc":
      query = query.order("code", { ascending: true });
      break;
    case "expiry_asc":
      query = query.order("expiry_date", { ascending: true, nullsFirst: false });
      break;
    default:
      query = query.order("created_at", { ascending: false }); // "newest" and unset
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapCoupon);
}

export async function getCouponById(db: DbClient, id: string): Promise<Coupon | null> {
  const { data, error } = await db.from("coupons").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapCoupon(data) : null;
}

/** Case-insensitive — coupon codes are conventionally typed in any case at checkout, but stored
 * (and unique-constrained) as whatever case an admin entered them in. */
async function getCouponByCode(db: DbClient, code: string): Promise<Coupon | null> {
  const { data, error } = await db.from("coupons").select("*").ilike("code", code.trim()).maybeSingle();
  if (error) throw error;
  return data ? mapCoupon(data) : null;
}

export async function createCoupon(db: DbClient, input: CreateCouponInput): Promise<Coupon> {
  const { data, error } = await db
    .from("coupons")
    .insert({
      code: input.code,
      discount_type: input.discountType,
      discount_value: input.discountValue,
      min_order_amount: input.minOrderAmount ?? null,
      max_discount: input.maxDiscount ?? null,
      start_date: input.startDate ?? null,
      expiry_date: input.expiryDate ?? null,
      usage_limit: input.usageLimit ?? null,
      per_user_usage_limit: input.perUserUsageLimit ?? null,
      is_active: input.isActive,
    })
    .select()
    .single();
  if (error) throw error;
  return mapCoupon(data);
}

export async function updateCoupon(db: DbClient, input: UpdateCouponInput): Promise<Coupon> {
  const { id, ...rest } = input;

  const { data, error } = await db
    .from("coupons")
    .update({
      ...(rest.code !== undefined && { code: rest.code }),
      ...(rest.discountType !== undefined && { discount_type: rest.discountType }),
      ...(rest.discountValue !== undefined && { discount_value: rest.discountValue }),
      ...(rest.minOrderAmount !== undefined && { min_order_amount: rest.minOrderAmount }),
      ...(rest.maxDiscount !== undefined && { max_discount: rest.maxDiscount }),
      ...(rest.startDate !== undefined && { start_date: rest.startDate }),
      ...(rest.expiryDate !== undefined && { expiry_date: rest.expiryDate }),
      ...(rest.usageLimit !== undefined && { usage_limit: rest.usageLimit }),
      ...(rest.perUserUsageLimit !== undefined && { per_user_usage_limit: rest.perUserUsageLimit }),
      ...(rest.isActive !== undefined && { is_active: rest.isActive }),
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return mapCoupon(data);
}

export async function deleteCoupon(db: DbClient, id: string) {
  const { error } = await db.from("coupons").delete().eq("id", id);
  if (error) throw error;
}

/** Whether this coupon has any redemption history — `coupon_usages.coupon_id` is
 * `on delete restrict`, so the database itself would block a hard delete here regardless; this is
 * the friendly pre-check `deleteCouponAction` uses to give a clear message instead of a raw
 * foreign-key-violation error, matching `isProductReferenced`'s exact role for `products`. */
export async function isCouponReferenced(db: DbClient, id: string): Promise<boolean> {
  const { count, error } = await db.from("coupon_usages").select("id", { count: "exact", head: true }).eq("coupon_id", id);
  if (error) throw error;
  return (count ?? 0) > 0;
}

/** Percentage or fixed, capped at `maxDiscount` (if set) and always capped at `subtotal` itself —
 * the second cap is what "prevent negative totals" actually means: a fixed discount larger than
 * the order is simply clamped down to the order's full value, not rejected outright. */
function computeDiscount(coupon: Coupon, subtotal: number): number {
  const raw = coupon.discountType === "percentage" ? subtotal * (coupon.discountValue / 100) : coupon.discountValue;
  const capped = coupon.maxDiscount !== null ? Math.min(raw, coupon.maxDiscount) : raw;
  return Math.min(capped, subtotal);
}

/**
 * Read-only pre-check, called from `checkoutService.placeOrder` *before* any order is created —
 * purely for fast, clean UX on an obviously-bad code (wrong code, expired, inactive, below
 * minimum), throwing a friendly `Error` for each. This is NOT the real enforcement boundary for
 * usage-limit correctness under concurrency; `redeemCoupon` (below) re-checks everything from
 * scratch atomically, under a row lock, right before actually claiming a redemption slot — a
 * coupon that races past its limit between this call and that one is still caught there. Never
 * skip straight to `redeemCoupon` without this pre-check either: without it, an obviously-invalid
 * coupon would still cost a full order-creation-then-rollback round trip instead of failing before
 * any write happens.
 */
export async function validateCoupon(
  db: DbClient,
  code: string,
  userId: string,
  subtotal: number,
): Promise<{ coupon: Coupon; discountAmount: number }> {
  const coupon = await getCouponByCode(db, code);
  if (!coupon) throw new Error("This coupon code doesn't exist.");
  if (!coupon.isActive) throw new Error("This coupon is no longer active.");

  const now = new Date();
  if (coupon.startDate && new Date(coupon.startDate) > now) throw new Error("This coupon isn't active yet.");
  if (coupon.expiryDate && new Date(coupon.expiryDate) < now) throw new Error("This coupon has expired.");
  if (coupon.minOrderAmount !== null && subtotal < coupon.minOrderAmount) {
    throw new Error(`This coupon requires a minimum order of ${formatCurrency(coupon.minOrderAmount)}.`);
  }
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    throw new Error("This coupon has reached its usage limit.");
  }

  if (coupon.perUserUsageLimit !== null) {
    const { count, error } = await db
      .from("coupon_usages")
      .select("id", { count: "exact", head: true })
      .eq("coupon_id", coupon.id)
      .eq("user_id", userId);
    if (error) throw error;
    if ((count ?? 0) >= coupon.perUserUsageLimit) {
      throw new Error("You've already used this coupon the maximum number of times.");
    }
  }

  return { coupon, discountAmount: computeDiscount(coupon, subtotal) };
}

export type RedeemCouponInput = {
  couponId: string;
  userId: string;
  orderId: string;
  discountAmount: number;
};

/**
 * The real enforcement boundary — one atomic `redeem_coupon()` Postgres function call (a row lock
 * on the coupon, full re-validation, the `used_count` increment, and the `coupon_usages` insert,
 * all in one transaction). Only ever called as the *last* step of `checkoutService.placeOrder`,
 * after the order/items/payment are already fully written — if this throws, the caller's existing
 * rollback-by-deleting-the-order path handles cleanup; nothing here needs its own undo.
 */
export async function redeemCoupon(db: DbClient, input: RedeemCouponInput): Promise<void> {
  const { error } = await db.rpc("redeem_coupon", {
    p_coupon_id: input.couponId,
    p_user_id: input.userId,
    p_order_id: input.orderId,
    p_discount_amount: input.discountAmount,
  });
  if (error) throw error;
}
