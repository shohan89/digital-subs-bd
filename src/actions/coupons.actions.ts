"use server";

import { revalidatePath } from "next/cache";

import { ROUTES } from "@/constants/routes";
import { createCouponSchema, updateCouponSchema, validateCouponSchema } from "@/features/coupons/schemas";
import { requireAdmin, requireUser } from "@/lib/auth/session";
import { checkRateLimit, rateLimitErrorMessage, rateLimitKeyByUser } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { couponsService } from "@/services";
import { actionError, actionSuccess, type ActionResult } from "@/types/api";
import type { Coupon } from "@/types/coupon";

/** `<input type="date">`'s "YYYY-MM-DD" value -> a full ISO timestamp for storage — `undefined`
 * passes through unchanged (an omitted/cleared date field). */
function toIsoOrUndefined(date: string | undefined): string | undefined {
  return date === undefined ? undefined : new Date(date).toISOString();
}

/** Coupon configuration has direct revenue impact — `requireAdmin()`, not `requireStaff()`, for
 * every action in this file, matching the page's own gating (see `/admin/coupons`'s doc comment)
 * and CLAUDE.md's "Coupons" rule. */
export async function createCouponAction(input: unknown): Promise<ActionResult<Coupon>> {
  await requireAdmin();

  const parsed = createCouponSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid input", parsed.error.flatten().fieldErrors);

  const supabase = await createServerSupabaseClient();
  try {
    const coupon = await couponsService.createCoupon(supabase, {
      ...parsed.data,
      startDate: toIsoOrUndefined(parsed.data.startDate),
      expiryDate: toIsoOrUndefined(parsed.data.expiryDate),
    });
    revalidatePath(ROUTES.adminCoupons);
    return actionSuccess(coupon);
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === "23505") return actionError("This code is already in use. Try a different one.", { code: ["Already in use"] });
    return actionError(error instanceof Error ? error.message : "Could not create coupon");
  }
}

export async function updateCouponAction(input: unknown): Promise<ActionResult<Coupon>> {
  await requireAdmin();

  const parsed = updateCouponSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid input", parsed.error.flatten().fieldErrors);

  const supabase = await createServerSupabaseClient();
  try {
    const coupon = await couponsService.updateCoupon(supabase, {
      ...parsed.data,
      startDate: toIsoOrUndefined(parsed.data.startDate),
      expiryDate: toIsoOrUndefined(parsed.data.expiryDate),
    });
    revalidatePath(ROUTES.adminCoupons);
    return actionSuccess(coupon);
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === "23505") return actionError("This code is already in use. Try a different one.", { code: ["Already in use"] });
    // `coupons_date_range_check` / the percentage-discount check — see `updateCouponSchema`'s
    // doc comment for why a partial update can't always be caught by a schema-level refine.
    if (code === "23514") return actionError("Please check the discount value and date range — the values entered aren't valid together.");
    return actionError(error instanceof Error ? error.message : "Could not update coupon");
  }
}

const REFERENCED_COUPON_MESSAGE =
  "This coupon has already been used on at least one order and can't be deleted. Deactivate it instead to stop new redemptions.";

/**
 * `coupon_usages.coupon_id` is `on delete restrict` — the database itself blocks deleting a coupon
 * with real redemption history, matching `deleteProductAction`'s exact shape: a friendly pre-check
 * (`isCouponReferenced`) plus a `23503` catch as the race-safe fallback for the gap between the
 * check and the delete.
 */
export async function deleteCouponAction(couponId: string): Promise<ActionResult> {
  await requireAdmin();

  const supabase = await createServerSupabaseClient();
  try {
    const referenced = await couponsService.isCouponReferenced(supabase, couponId);
    if (referenced) return actionError(REFERENCED_COUPON_MESSAGE);

    await couponsService.deleteCoupon(supabase, couponId);
    revalidatePath(ROUTES.adminCoupons);
    return actionSuccess(undefined);
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === "23503") return actionError(REFERENCED_COUPON_MESSAGE);
    return actionError(error instanceof Error ? error.message : "Could not delete coupon");
  }
}

/**
 * Checkout's "Apply coupon" preview — read-only, `requireUser()` (any signed-in customer), runs on
 * the service-role client because `coupons`' RLS is `is_admin()`-only (see that table's policy
 * comment: exposing the full table to a customer session would let anyone list every code, so even
 * a single-code lookup needs to go through code the customer's own session can't run directly).
 * `subtotal` here is only ever used to compute a *preview* number shown back to this same request —
 * it does NOT influence the real order. `checkoutService.placeOrder` independently re-derives the
 * subtotal from the actual re-priced order items and re-validates/re-redeems the coupon completely
 * fresh at submission time, so nothing this preview returns is ever trusted for the real charge.
 */
export async function validateCouponAction(input: unknown): Promise<ActionResult<{ code: string; discountAmount: number }>> {
  const user = await requireUser();

  // A signed-in-but-otherwise-unrestricted account could otherwise call this an unbounded number
  // of times to brute-force valid coupon codes — generous enough for normal cart use (typos,
  // trying a couple of codes), not for enumeration.
  const rateLimit = await checkRateLimit(rateLimitKeyByUser("validate-coupon", user.id), { limit: 20, windowSeconds: 10 * 60 });
  if (!rateLimit.allowed) return actionError(rateLimitErrorMessage(rateLimit.retryAfterSeconds));

  const parsed = validateCouponSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid input", parsed.error.flatten().fieldErrors);

  const supabase = createAdminClient();
  try {
    const { coupon, discountAmount } = await couponsService.validateCoupon(supabase, parsed.data.code, user.id, parsed.data.subtotal);
    return actionSuccess({ code: coupon.code, discountAmount });
  } catch (error) {
    return actionError(error instanceof Error ? error.message : "Could not apply this coupon");
  }
}
