"use server";

import { revalidatePath } from "next/cache";

import { REVIEW_STATUS_LABEL } from "@/constants/reviews";
import { ROUTES } from "@/constants/routes";
import { createReviewSchema, moderateReviewSchema } from "@/features/reviews/schemas";
import { requireStaff, requireUser } from "@/lib/auth/session";
import { checkRateLimit, rateLimitErrorMessage, rateLimitKeyByUser } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notificationsService, ordersService, productsService, reviewsService } from "@/services";
import { actionError, actionSuccess, type ActionResult } from "@/types/api";

/**
 * Runs on the caller's own session-scoped client, not service-role — the "Reviews: insert own
 * verified buyer" RLS policy is the real enforcement (see `reviewsService.createReview`'s doc
 * comment); `hasCompletedOrderForProduct` here is only for a clear error message before that.
 */
export async function createReviewAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();

  // Already constrained by verified-purchase eligibility and a one-review-per-product unique
  // constraint, so this is a generous backstop against scripted spam, not the primary defense.
  const rateLimit = await checkRateLimit(rateLimitKeyByUser("create-review", user.id), { limit: 10, windowSeconds: 60 * 60 });
  if (!rateLimit.allowed) return actionError(rateLimitErrorMessage(rateLimit.retryAfterSeconds));

  const parsed = createReviewSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid input", parsed.error.flatten().fieldErrors);

  const supabase = await createServerSupabaseClient();
  try {
    const eligible = await ordersService.hasCompletedOrderForProduct(supabase, user.id, parsed.data.productId);
    if (!eligible) {
      return actionError("You can only review products from a completed order.");
    }

    const review = await reviewsService.createReview(supabase, user.id, parsed.data);
    await notifyStaffOfNewReview(review.id, parsed.data.productId);
    return actionSuccess(undefined);
  } catch (error) {
    // `reviews_product_id_user_id_key` — already reviewed this product.
    const code = (error as { code?: string } | null)?.code;
    if (code === "23505") return actionError("You've already reviewed this product.");
    return actionError(error instanceof Error ? error.message : "Could not submit your review");
  }
}

/**
 * `createReviewAction` runs on the caller's own (customer) session-scoped client — customers have
 * no read access to other users' `profiles` and no INSERT policy on `notifications` at all, so
 * this needs its own service-role client, same reasoning as `checkoutService.placeOrder`. Non-
 * fatal like `notifyReviewer`: the review itself already committed under RLS by the time this
 * runs, so a notification failure shouldn't turn into a false "could not submit your review".
 */
async function notifyStaffOfNewReview(reviewId: string, productId: string) {
  try {
    const admin = createAdminClient();
    const product = await productsService.getProductById(admin, productId);
    await notificationsService.notifyStaff(admin, {
      type: "new_review",
      title: "New customer review",
      message: `A new review was submitted for ${product?.name ?? "a product"}.`,
      relatedId: reviewId,
    });
  } catch (error) {
    console.error("Failed to send new-review notification", error);
  }
}

async function notifyReviewer(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  productName: string | null,
  approved: boolean,
  reviewId: string,
) {
  try {
    await notificationsService.createNotification(supabase, {
      userId,
      title: approved ? "Review published" : "Review not published",
      message: approved
        ? `Your review for ${productName ?? "a product"} is now live.`
        : `Your review for ${productName ?? "a product"} isn't visible on the product page right now.`,
      type: approved ? "review_published" : "review_hidden",
      relatedId: reviewId,
    });
  } catch (error) {
    // Non-fatal — the moderation decision itself already committed.
    console.error("Failed to send review-moderation notification", error);
  }
}

/**
 * Operational (moderation) — staff, not admin-only, matching every other catalog/content action.
 * Unlike the original single-shot version, a review can move between `approved`/`hidden` freely in
 * either direction (an admin re-approving a review they hid by mistake, or taking down one they'd
 * previously approved) — `"pending"` is deliberately not a valid target at all
 * (`moderateReviewSchema`'s enum excludes it), since nothing should ever move a review backward to
 * "awaiting moderation" once a decision's been made.
 *
 * `expectedStatus` (the status the client believed the review was in when it rendered the
 * Approve/Hide button) is checked twice: once here for a friendly "someone already changed this"
 * message, and again inside `updateReviewStatus`'s guarded `UPDATE ... WHERE status = expectedStatus`
 * — that second check is the real protection against two staff moderating the same review at once.
 */
export async function moderateReviewAction(input: unknown): Promise<ActionResult> {
  await requireStaff();

  const parsed = moderateReviewSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid input", parsed.error.flatten().fieldErrors);

  const supabase = await createServerSupabaseClient();
  try {
    const review = await reviewsService.getReviewById(supabase, parsed.data.reviewId);
    if (!review) return actionError("Review not found");
    if (review.status !== parsed.data.expectedStatus) {
      return actionError(`This review is already ${REVIEW_STATUS_LABEL[review.status].toLowerCase()} — refresh and try again.`);
    }

    const updated = await reviewsService.updateReviewStatus(supabase, parsed.data.reviewId, parsed.data.status, parsed.data.expectedStatus);
    if (!updated) return actionError("This review was just changed by someone else — refresh and try again.");

    await notifyReviewer(supabase, review.userId, review.productName, parsed.data.status === "approved", review.id);

    revalidatePath(ROUTES.adminReviews);
    return actionSuccess(undefined);
  } catch (error) {
    return actionError(error instanceof Error ? error.message : "Could not moderate this review");
  }
}

/** Staff-only, matching `moderateReviewAction` — content moderation, not admin-only. No FK
 * references `reviews`, so unlike products/coupons there's nothing to pre-check for "safe to
 * delete"; RLS's "Reviews: staff full access" policy is the actual guarantee, this is just the
 * application-layer gate in front of it. */
export async function deleteReviewAction(reviewId: string): Promise<ActionResult> {
  await requireStaff();

  const supabase = await createServerSupabaseClient();
  try {
    await reviewsService.deleteReview(supabase, reviewId);
    revalidatePath(ROUTES.adminReviews);
    return actionSuccess(undefined);
  } catch (error) {
    return actionError(error instanceof Error ? error.message : "Could not delete this review");
  }
}
