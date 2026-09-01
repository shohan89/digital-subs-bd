import type { ReviewStatus } from "@/constants/reviews";

/**
 * `reviewerName`/`reviewerEmail` are deliberately not part of this public-safe type — `reviews` is
 * public-read for `status = 'approved'` rows, and showing a customer's real name/email on a public
 * product page is a privacy choice this app doesn't make, independent of whether the data is
 * technically available (see `AdminReview` below — it now is, as of the moderation-search work).
 */
export type Review = {
  id: string;
  productId: string;
  productName: string | null;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  createdAt: string;
};

/**
 * Admin list only — `reviewerName`/`reviewerEmail` are a snapshot taken at submission time
 * (`reviewsService.createReview`), not a live join to `profiles`. `profiles` SELECT is
 * `is_admin()`-only, but `/admin/reviews` is `requireStaff()`-gated (admin OR manager) same as
 * every other operational admin page — a live join here would silently return `null` for a
 * manager's session (this was a real bug, fixed by this snapshot; see the migration adding these
 * columns). Never surface this type on a customer-facing page.
 */
export type AdminReview = Review & {
  userId: string;
  reviewerName: string | null;
  reviewerEmail: string;
};
