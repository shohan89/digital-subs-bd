import Image from "next/image";
import Link from "next/link";
import { Package } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { FeatureList } from "@/features/products/components/feature-list";
import { PriceDisplay } from "@/features/products/components/price-display";
import { ProductBadge } from "@/features/products/components/product-badge";
import { ROUTES } from "@/constants/routes";
import type { Product } from "@/types/product";

/** "Buy" links to the product detail page, not a live purchase — checkout/cart isn't built yet.
 * `priority` should be `true` only for the first row of cards in a grid (the LCP candidate on
 * `/shop`, `/category/[slug]`, and the homepage's grids) — `ProductGrid` sets it based on index,
 * never pass it for every card in a list. */
export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  return (
    <article className="h-full">
      <Card className="h-full">
        <div className="relative flex aspect-video items-center justify-center bg-muted">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover"
              priority={priority}
            />
          ) : (
            <Package className="size-10 text-muted-foreground" aria-hidden="true" />
          )}
          <ProductBadge product={product} className="absolute top-2 right-2" />
        </div>

        <CardContent className="flex flex-1 flex-col gap-3">
          <div>
            {product.category && (
              <p className="text-xs font-medium tracking-wide text-primary uppercase">{product.category.name}</p>
            )}
            <h3 className="font-heading text-base font-medium">
              <Link href={ROUTES.product(product.slug)} className="hover:underline">
                {product.name}
              </Link>
            </h3>
            {product.shortDescription && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{product.shortDescription}</p>
            )}
          </div>

          <FeatureList features={product.features} limit={3} />

          <PriceDisplay
            price={product.price}
            comparePrice={product.comparePrice}
            duration={product.duration}
            className="mt-auto"
          />
        </CardContent>

        <CardFooter>
          <Button asChild className="w-full">
            <Link href={ROUTES.product(product.slug)}>Buy now</Link>
          </Button>
        </CardFooter>
      </Card>
    </article>
  );
}
