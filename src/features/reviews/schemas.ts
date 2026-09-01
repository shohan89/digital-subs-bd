import { z } from "zod";

import { REVIEW_STATUS } from "@/constants/reviews";

export const createReviewSchema = z.object({
  productId: z.string().uuid(),
  // Not `z.coerce.number()` — `rating` always arrives as a real number here (from
  // `StarRatingInput`'s `onChange`, then passed as a plain object to the action, never through
  // `FormData`), and coercion muddies `zodResolver`'s inferred input/output types for no benefit.
  rating: z.number().int().min(1, "Select a rating").max(5),
  comment: z.string().min(10, "Please write at least 10 characters").max(1000, "Keep it under 1000 characters"),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const moderateReviewSchema = z.object({
  reviewId: z.string().uuid(),
  // "pending" is deliberately not a valid target — nothing ever moves a review back to pending;
  // see `moderateReviewAction`'s doc comment.
  status: z.enum(["approved", "hidden"]),
  // The status the client believes the review is currently in — passed straight through to
  // `updateReviewStatus`'s `expectedStatus` guard, so two staff moderating the same review at once
  // can't silently clobber each other.
  expectedStatus: z.enum(REVIEW_STATUS),
});

export type ModerateReviewInput = z.infer<typeof moderateReviewSchema>;

export const adminReviewFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(REVIEW_STATUS).optional(),
  rating: z.coerce.number().int().min(1, "Invalid rating").max(5, "Invalid rating").optional(),
});

export type AdminReviewFilters = z.infer<typeof adminReviewFiltersSchema>;
