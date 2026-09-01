import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

type StarRatingProps = {
  /** Not necessarily an integer (e.g. a product's average) — rounded for the fill threshold. */
  value: number;
  size?: "sm" | "md";
  className?: string;
};

/** Read-only 5-star display — used for both an exact review rating and a rounded average.
 * Previously duplicated inline in three places (`product-reviews.tsx`, `product-rating.tsx`,
 * `testimonials.tsx`); this is the single shared version. For a clickable input, see
 * `features/reviews/components/star-rating-input.tsx` instead — this component is display-only. */
export function StarRating({ value, size = "sm", className }: StarRatingProps) {
  const filled = Math.round(value);

  return (
    <div
      className={cn("flex gap-0.5", className)}
      role="img"
      aria-label={`Rated ${value % 1 === 0 ? value : value.toFixed(1)} out of 5`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          aria-hidden="true"
          className={cn(size === "sm" ? "size-4" : "size-5", i < filled ? "fill-accent text-accent" : "text-muted")}
        />
      ))}
    </div>
  );
}
