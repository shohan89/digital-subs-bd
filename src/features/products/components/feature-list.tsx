import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

type FeatureListProps = {
  features: string[];
  /** Cap how many show — e.g. a compact `ProductCard` shows the first 3, the detail page shows all. */
  limit?: number;
  className?: string;
};

export function FeatureList({ features, limit, className }: FeatureListProps) {
  const shown = limit ? features.slice(0, limit) : features;
  if (shown.length === 0) return null;

  return (
    <ul className={cn("flex flex-col gap-1", className)}>
      {shown.map((feature) => (
        <li key={feature} className="flex items-start gap-1.5 text-sm text-muted-foreground">
          <Check className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span className={limit ? "line-clamp-1" : undefined}>{feature}</span>
        </li>
      ))}
    </ul>
  );
}
