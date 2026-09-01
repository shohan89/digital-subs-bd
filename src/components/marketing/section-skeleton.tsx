import { Container } from "@/components/shared/container";
import { Skeleton } from "@/components/ui/skeleton";

type SectionSkeletonProps = {
  cards?: number;
  /** Must match the *real* section's grid column classes exactly — this fallback is reused across
   * three homepage sections with different real layouts (`CategoriesSection`'s icon-card grid,
   * `FeaturedProducts`' `ProductGrid`, `Testimonials`' text-card grid), so a mismatched column
   * count here causes a visible reflow the moment real content replaces it. Defaults to
   * `CategoriesSection`'s grid (the one section this already matched); `FeaturedProducts` and
   * `Testimonials` each pass their own. */
  gridClassName?: string;
};

/** Suspense fallback for a section's data-fetching body — mirrors its grid shape so nothing jumps once real content streams in. */
export function SectionSkeleton({ cards = 4, gridClassName = "grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4" }: SectionSkeletonProps) {
  return (
    <section className="py-16 sm:py-20">
      <Container className="flex flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className={`grid w-full ${gridClassName}`}>
          {Array.from({ length: cards }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </Container>
    </section>
  );
}
