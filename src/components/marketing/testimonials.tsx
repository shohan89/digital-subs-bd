import { Card } from "@/components/ui/card";
import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/shared/reveal";
import { SectionTitle } from "@/components/shared/section-title";
import { StarRating } from "@/components/shared/star-rating";
import { createStaticSupabaseClient } from "@/lib/supabase/static";
import { reviewsService } from "@/services";
import type { Review } from "@/types/review";

async function getReviews(): Promise<{ reviews: Review[]; error: boolean }> {
  try {
    // Cookie-free client — see `CategoriesSection`'s identical note. `listFeaturedReviews` only
    // ever reads publicly-approved reviews, exactly what an anonymous visitor could already see.
    const supabase = createStaticSupabaseClient();
    const reviews = await reviewsService.listFeaturedReviews(supabase);
    return { reviews, error: false };
  } catch {
    return { reviews: [], error: true };
  }
}

// `listFeaturedReviews` only ever returns approved reviews (see its doc comment) — until a
// customer submits one and an admin approves it, this section renders nothing rather than a
// broken/empty grid or fabricated placeholder quotes. A load failure is treated the same way:
// fail quietly, not visibly, since testimonials aren't essential page content the way
// products/categories are.
export async function Testimonials() {
  const { reviews, error } = await getReviews();
  if (error || reviews.length === 0) return null;

  return (
    <section className="py-16 sm:py-20">
      <Container className="flex flex-col gap-10">
        <SectionTitle
          eyebrow="Testimonials"
          title="What customers say"
          align="center"
          className="items-center"
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review, index) => (
            <Reveal key={review.id} delay={index * 0.06}>
              <Card className="h-full gap-3 p-6">
                <StarRating value={review.rating} />
                {review.comment && <p className="text-sm text-muted-foreground">&ldquo;{review.comment}&rdquo;</p>}
                {review.productName && (
                  <p className="mt-auto text-xs font-medium text-muted-foreground">
                    Verified customer · {review.productName}
                  </p>
                )}
              </Card>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
