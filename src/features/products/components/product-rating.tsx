import { EmptyState, StarRating } from "@/components/shared";
import type { RatingSummary } from "@/services/reviews.service";

export function ProductRating({ average, count }: RatingSummary) {
  if (count === 0) {
    return <EmptyState message="No reviews yet" />;
  }

  return (
    <div className="flex items-center gap-1.5">
      <StarRating value={average} />
      <span className="text-sm text-muted-foreground">
        {average.toFixed(1)} ({count} review{count === 1 ? "" : "s"})
      </span>
    </div>
  );
}
