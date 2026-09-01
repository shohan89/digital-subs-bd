export const REVIEW_STATUS = ["pending", "approved", "hidden"] as const;

export type ReviewStatus = (typeof REVIEW_STATUS)[number];

export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  hidden: "Hidden",
};

/** Rating filter for the admin review list — every allowed `reviews.rating` value. */
export const REVIEW_RATINGS = [1, 2, 3, 4, 5] as const;

export type ReviewRating = (typeof REVIEW_RATINGS)[number];
