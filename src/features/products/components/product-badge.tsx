import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";

/** "Save N%" badge, computed from `price`/`comparePrice`. Renders nothing when the product isn't discounted. */
export function ProductBadge({ product, className }: { product: Product; className?: string }) {
  if (!product.comparePrice || product.comparePrice <= product.price) return null;

  const discountPercent = Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100);
  if (discountPercent <= 0) return null;

  return (
    <Badge className={cn("bg-accent text-accent-foreground", className)}>
      -{discountPercent}%
    </Badge>
  );
}
