import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/shared/reveal";
import { SectionTitle } from "@/components/shared/section-title";
import { StarRating } from "@/components/shared/star-rating";
import { ROUTES } from "@/constants/routes";
import { REVIEW_STATUS_LABEL } from "@/constants/reviews";
import { ReviewForm } from "@/features/reviews/components";
import { getCurrentUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ordersService, reviewsService } from "@/services";
import type { Review } from "@/types/review";

type ReviewsData = {
  reviews: Review[];
  error: boolean;
  /** `null` when signed out — the submission section only ever renders for a signed-in visitor. */
  submissionState: "not-eligible" | "can-review" | { existing: Review } | null;
};

async function loadReviewsData(productId: string): Promise<ReviewsData> {
  let reviews: Review[] = [];
  let error = false;
  try {
    const supabase = await createServerSupabaseClient();
    reviews = await reviewsService.listReviewsForProduct(supabase, productId);
  } catch {
    error = true;
  }

  const user = await getCurrentUser();
  if (!user) return { reviews, error, submissionState: null };

  try {
    const supabase = await createServerSupabaseClient();
    const existing = await reviewsService.getUserReviewForProduct(supabase, user.id, productId);
    if (existing) return { reviews, error, submissionState: { existing } };

    const eligible = await ordersService.hasCompletedOrderForProduct(supabase, user.id, productId);
    return { reviews, error, submissionState: eligible ? "can-review" : "not-eligible" };
  } catch {
    return { reviews, error, submissionState: "not-eligible" };
  }
}

/** Only a signed-in customer with a completed order for this product, who hasn't already
 * reviewed it, gets the submission form — see `ordersService.hasCompletedOrderForProduct` and the
 * "Reviews: insert own verified buyer" RLS policy, which is the actual enforcement either way. */
export async function ProductReviews({ productId }: { productId: string }) {
  const { reviews, error, submissionState } = await loadReviewsData(productId);

  return (
    <section className="py-16 sm:py-20">
      <Container className="flex flex-col gap-10">
        <SectionTitle eyebrow="Reviews" title="Customer reviews" align="center" className="items-center" />

        {error ? (
          <Alert variant="destructive" className="mx-auto max-w-md">
            <AlertTriangle />
            <AlertDescription>Couldn&apos;t load reviews right now. Please try again shortly.</AlertDescription>
          </Alert>
        ) : reviews.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            No reviews yet — be the first to review this product.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review, index) => (
              <Reveal key={review.id} delay={Math.min(index, 8) * 0.05}>
                <Card className="h-full gap-3 p-6">
                  <StarRating value={review.rating} />
                  {review.comment && <p className="text-sm text-muted-foreground">&ldquo;{review.comment}&rdquo;</p>}
                  <p className="mt-auto text-xs font-medium text-muted-foreground">Verified customer</p>
                </Card>
              </Reveal>
            ))}
          </div>
        )}

        <div className="mx-auto w-full max-w-lg">
          {submissionState === "can-review" && <ReviewForm productId={productId} />}
          {submissionState && typeof submissionState === "object" && (
            <div className="rounded-xl border border-border/60 p-5 text-sm text-muted-foreground">
              Your review is{" "}
              <span className="font-medium text-foreground">
                {REVIEW_STATUS_LABEL[submissionState.existing.status].toLowerCase()}
              </span>
              {submissionState.existing.status === "pending" && " — it'll appear once an admin reviews it"}
              {submissionState.existing.status === "hidden" && " and isn't shown publicly right now"}
              .
            </div>
          )}
          {submissionState === "not-eligible" && (
            <p className="text-center text-xs text-muted-foreground">
              Only customers with a completed order for this product can leave a review.{" "}
              <Link href={ROUTES.dashboardOrders} className="underline underline-offset-4">
                View your orders
              </Link>
              .
            </p>
          )}
        </div>
      </Container>
    </section>
  );
}
