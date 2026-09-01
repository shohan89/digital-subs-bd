import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";
import { SectionTitle } from "@/components/shared/section-title";
import { ProductGrid } from "@/features/products/components";
import { ROUTES } from "@/constants/routes";
import { createStaticSupabaseClient } from "@/lib/supabase/static";
import { productsService } from "@/services";
import type { Product } from "@/types/product";

const FEATURED_LIMIT = 8;

async function getFeaturedProducts(): Promise<{ products: Product[]; error: boolean }> {
  try {
    // Cookie-free client — see `CategoriesSection`'s identical note; public active-product data,
    // keeps the homepage cacheable.
    const supabase = createStaticSupabaseClient();
    // No `is_featured` column on `products` — "featured" is just the newest active listings
    // (the default sort). See PROJECT_STRUCTURE.md's Database schema note.
    const products = await productsService.listProducts(supabase, {}, { limit: FEATURED_LIMIT });
    return { products, error: false };
  } catch {
    return { products: [], error: true };
  }
}

export async function FeaturedProducts() {
  const { products, error } = await getFeaturedProducts();

  if (!error && products.length === 0) return null;

  return (
    <section className="py-16 sm:py-20">
      <Container className="flex flex-col gap-10">
        <SectionTitle
          eyebrow="Featured"
          title="Popular subscriptions"
          description="Hand-picked digital products, delivered instantly after purchase."
          align="center"
          className="items-center"
        />

        {error ? (
          <Alert variant="destructive" className="mx-auto max-w-md">
            <AlertTriangle />
            <AlertDescription>Couldn&apos;t load products right now. Please try again shortly.</AlertDescription>
          </Alert>
        ) : (
          <>
            <ProductGrid products={products} />
            <Button asChild variant="outline" className="mx-auto">
              <Link href={ROUTES.shop}>View all products</Link>
            </Button>
          </>
        )}
      </Container>
    </section>
  );
}
