import type { AdminReviewFilters } from "@/features/reviews/schemas";
import type { ReviewStatus } from "@/constants/reviews";
import type { DbClient } from "@/services/types";
import type { AdminReview, Review } from "@/types/review";
import { escapeOrFilterValue } from "@/utils/postgrest";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw row shape, DbClient is untyped until database.types.ts is generated (see comment there)
function mapReview(row: any): Review {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product?.name ?? null,
    rating: row.rating,
    comment: row.comment,
    status: row.status,
    createdAt: row.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
function mapAdminReview(row: any): AdminReview {
  return {
    ...mapReview(row),
    userId: row.user_id,
    reviewerName: row.reviewer_name,
    reviewerEmail: row.reviewer_email,
  };
}

/**
 * For marketing display (homepage testimonials) — highest-rated first, most recent among ties.
 * `.eq("status", "approved")` is explicit here even though the "Reviews: public read approved"
 * RLS policy would already block anything else — same reasoning as
 * `productsService.listProducts`'s explicit `status = 'active'` filter: don't rely on RLS alone to
 * also mean "don't show it," since this runs on whatever client the caller passes in (which, for a
 * signed-in reviewer browsing their own product, could also satisfy the separate "view own"
 * policy and let their own pending/hidden review leak into a public list).
 */
export async function listFeaturedReviews(db: DbClient, minRating = 4, limit = 6): Promise<Review[]> {
  const { data, error } = await db
    .from("reviews")
    .select("*, product:products(name)")
    .eq("status", "approved")
    .gte("rating", minRating)
    .order("rating", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(mapReview);
}

/** For a product detail page's Reviews section — every *approved* review for one product, newest
 * first. See `listFeaturedReviews`'s doc comment for why `status` is filtered explicitly. */
export async function listReviewsForProduct(db: DbClient, productId: string, limit = 10): Promise<Review[]> {
  const { data, error } = await db
    .from("reviews")
    .select("*")
    .eq("product_id", productId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(mapReview);
}

/** The signed-in user's own review for this product, regardless of status — for the product page
 * to show "your review is pending"/"was hidden" instead of the submission form once they've
 * already reviewed it. Relies on the "Reviews: view own" RLS policy (only visible to its author). */
export async function getUserReviewForProduct(db: DbClient, userId: string, productId: string): Promise<Review | null> {
  const { data, error } = await db
    .from("reviews")
    .select("*")
    .eq("product_id", productId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapReview(data) : null;
}

export type RatingSummary = { average: number; count: number };

/**
 * Fetches just the `rating` column and averages in JS rather than a `select avg(rating)` —
 * PostgREST's aggregate-function support is version-dependent and fiddly to get right without a
 * live project to verify against; a per-product review count is small enough that this is fine.
 * Only approved reviews count toward the displayed average — see `listFeaturedReviews`'s comment.
 */
export async function getRatingSummary(db: DbClient, productId: string): Promise<RatingSummary> {
  const { data, error } = await db.from("reviews").select("rating").eq("product_id", productId).eq("status", "approved");
  if (error) throw error;

  const ratings = data ?? [];
  if (ratings.length === 0) return { average: 0, count: 0 };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw row shape, see mapReview above
  const total = ratings.reduce((sum: number, row: any) => sum + row.rating, 0);
  return { average: total / ratings.length, count: ratings.length };
}

export type CreateReviewInput = { productId: string; rating: number; comment: string };

/**
 * Inserts on the caller's own session-scoped client — the "Reviews: insert own verified buyer"
 * RLS policy is the actual verified-buyer enforcement (an exists-check against `order_items`/
 * `orders` for a completed order), not just an app-layer check, so no service-role client is
 * needed here. `status` is never accepted from the caller: the column defaults to `'pending'`,
 * and the RLS policy's `with check` requires it stays `'pending'` on insert regardless.
 *
 * `reviewer_name`/`reviewer_email` are snapshotted from `profiles` at insert time — this read is
 * scoped to the caller's *own* row, which "Profiles: view own" permits regardless of role. See
 * `AdminReview`'s doc comment for why this snapshot exists instead of a live join at read time.
 */
export async function createReview(db: DbClient, userId: string, input: CreateReviewInput): Promise<Review> {
  const { data: profile, error: profileError } = await db.from("profiles").select("full_name, email").eq("id", userId).single();
  if (profileError) throw profileError;

  const { data, error } = await db
    .from("reviews")
    .insert({
      product_id: input.productId,
      user_id: userId,
      rating: input.rating,
      comment: input.comment,
      reviewer_name: profile.full_name,
      reviewer_email: profile.email,
    })
    .select()
    .single();
  if (error) throw error;
  return mapReview(data);
}

export type AdminListReviewsOptions = {
  /** Max rows to return. Same "fetch one extra, slice, check hasMore" contract as every other
   * admin list in this app — pass `pageSize + 1` and handle it yourself. */
  limit?: number;
  offset?: number;
};

/**
 * Admin review list — search across `reviewer_name`/`reviewer_email` (real columns on `reviews`
 * now, not a live `profiles` join — see `AdminReview`'s doc comment for why), filter by status
 * and/or star rating, oldest first (a moderation queue reads top-to-bottom as "what's been waiting
 * longest," same as `order_activity`'s timeline ordering). Runs on the caller's own session-scoped
 * client: `/admin/reviews` is `requireStaff()`-gated and `reviews`' own "staff full access" RLS
 * policy already grants that session everything this query needs — no RLS gap to work around here,
 * unlike the old live `profiles` join this replaces.
 */
export async function listReviewsForAdmin(
  db: DbClient,
  filters: AdminReviewFilters = {},
  options: AdminListReviewsOptions = {},
): Promise<AdminReview[]> {
  let query = db.from("reviews").select("*, product:products(name)");

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.rating) query = query.eq("rating", filters.rating);

  if (filters.search) {
    const term = filters.search.trim();
    if (term) {
      const pattern = escapeOrFilterValue(`%${term}%`);
      query = query.or(`reviewer_name.ilike.${pattern},reviewer_email.ilike.${pattern}`);
    }
  }

  query = query.order("created_at", { ascending: true });

  if (options.offset !== undefined && options.limit !== undefined) {
    query = query.range(options.offset, options.offset + options.limit - 1);
  } else if (options.limit !== undefined) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapAdminReview);
}

export async function getReviewById(db: DbClient, reviewId: string): Promise<AdminReview | null> {
  const { data, error } = await db.from("reviews").select("*, product:products(name)").eq("id", reviewId).maybeSingle();
  if (error) throw error;
  return data ? mapAdminReview(data) : null;
}

/** Raw status flip, `expectedStatus`-guarded the same way `paymentsService.updatePaymentStatus`
 * is — protects against two staff moderating the same review at once. */
export async function updateReviewStatus(
  db: DbClient,
  reviewId: string,
  status: ReviewStatus,
  expectedStatus: ReviewStatus,
): Promise<Review | null> {
  const { data, error } = await db
    .from("reviews")
    .update({ status })
    .eq("id", reviewId)
    .eq("status", expectedStatus)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data ? mapReview(data) : null;
}

/** Staff-only via `deleteReviewAction`'s `requireStaff()` gate — RLS's "Reviews: staff full
 * access" policy (`for all`) already permits this at the database level too, so there's no gap
 * between the two layers. No FK anywhere references `reviews`, so there's no "delete when safe"
 * pre-check needed the way products/coupons have — a review is always safe to delete. */
export async function deleteReview(db: DbClient, reviewId: string): Promise<void> {
  const { error } = await db.from("reviews").delete().eq("id", reviewId);
  if (error) throw error;
}
