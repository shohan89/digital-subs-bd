import { Reveal } from "@/components/shared/reveal";
import { ProductCard } from "@/features/products/components/product-card";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";

type ProductGridProps = {
  products: Product[];
  emptyMessage?: string;
  className?: string;
};

/** Responsive product grid with a staggered reveal — the one place that lays out `ProductCard`s. */
export function ProductGrid({ products, emptyMessage = "No products found.", className }: ProductGridProps) {
  if (products.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className={cn("grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {products.map((product, index) => (
        <Reveal key={product.id} delay={Math.min(index, 8) * 0.05}>
          {/* First row only (the LCP candidate on every page this renders on) — `next/image`
              warns if `priority` is set on more images than are actually above the fold. */}
          <ProductCard product={product} priority={index < 4} />
        </Reveal>
      ))}
    </div>
  );
}
