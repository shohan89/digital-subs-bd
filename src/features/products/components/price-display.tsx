import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/format-currency";

type PriceDisplayProps = {
  price: number;
  comparePrice?: number | null;
  duration?: number | null;
  className?: string;
  size?: "default" | "lg";
};

/** Formats a product's price, strikethrough compare-at price, and duration consistently everywhere it's shown. */
export function PriceDisplay({ price, comparePrice, duration, className, size = "default" }: PriceDisplayProps) {
  const durationLabel = duration === 30 ? "/ month" : duration ? `/ ${duration} days` : null;
  const isDiscounted = comparePrice && comparePrice > price;

  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <span className={cn("font-semibold", size === "lg" ? "text-2xl" : "text-lg")}>{formatCurrency(price)}</span>
      {isDiscounted && (
        <span className="text-sm text-muted-foreground line-through">{formatCurrency(comparePrice)}</span>
      )}
      {durationLabel && <span className="text-xs text-muted-foreground">{durationLabel}</span>}
    </div>
  );
}
