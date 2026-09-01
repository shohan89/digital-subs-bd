"use client";

import { useState } from "react";
import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

type StarRatingInputProps = {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
};

/** Clickable/hoverable 1-5 star selector for the review form — the interactive counterpart to
 * `components/shared/star-rating.tsx`'s read-only display. */
export function StarRatingInput({ value, onChange, disabled }: StarRatingInputProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const displayValue = hovered ?? value;

  return (
    <div role="radiogroup" aria-label="Rating" className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star${star === 1 ? "" : "s"}`}
          disabled={disabled}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(null)}
          onClick={() => onChange(star)}
          className="p-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Star
            className={cn(
              "size-7 transition-colors",
              star <= displayValue ? "fill-accent text-accent" : "text-muted hover:text-accent/50",
            )}
          />
        </button>
      ))}
    </div>
  );
}
