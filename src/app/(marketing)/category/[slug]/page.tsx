import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { Container } from "@/components/shared/container";
import { JsonLd } from "@/components/shared/json-ld";
import { SectionTitle } from "@/components/shared/section-title";
import { CategoryBanner, CategoryFaq } from "@/features/categories/components";
import { ProductGrid } from "@/features/products/components";
import { ROUTES } from "@/constants/routes";
import { siteConfig } from "@/constants/site";
import { buildCategoryJsonLd } from "@/lib/json-ld";
import { buildMetadata, NOINDEX_ROBOTS } from "@/lib/seo";
import { createStaticSupabaseClient } from "@/lib/supabase/static";
import { categoriesService, productsService } from "@/services";

// Statically generated per category at build time (see `generateStaticParams` below), refreshed
// on-demand at most once an hour — this route deliberately avoids `createServerSupabaseClient`
// (cookies-based, forces dynamic rendering) in favor of `createStaticSupabaseClient`, since a
// category page has no user-specific content that would need a session.
export const revalidate = 3600;

const FEATURED_PRODUCTS_LIMIT = 8;

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

// Shared across generateStaticParams/generateMetadata/the page component within one request.
const loadCategory = cache(async (slug: string) => {
  const supabase = createStaticSupabaseClient();
  return categoriesService.getCategoryBySlug(supabase, slug);
});

export async function generateStaticParams() {
  try {
    const supabase = createStaticSupabaseClient();
    const categories = await categoriesService.listCategories(supabase);
    return categories.map((category) => ({ slug: category.slug }));
  } catch {
    // Build-time Supabase hiccup shouldn't fail the whole site build — fall back to rendering
    // every category on-demand instead (`dynamicParams` defaults to true).
    return [];
  }
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await loadCategory(slug).catch(() => null);
  // Same explicit-noindex reasoning as the product page for "not found." An *inactive* category
  // also gets `noIndex` here — `getCategoryBySlug` doesn't filter `status` (unlike
  // `getProductBySlug`), so a deactivated category is still reachable by direct link; it should
  // never be indexable even though the page itself doesn't 404 for it (that's a separate,
  // deliberately out-of-scope access-control decision — see PROJECT_STRUCTURE.md's SEO section).
  if (!category) return { robots: NOINDEX_ROBOTS };

  const description = category.description ?? `Browse ${category.name} subscriptions at ${siteConfig.name}.`;

  return buildMetadata({
    title: category.name,
    description,
    path: ROUTES.category(category.slug),
    image: category.image,
    noIndex: category.status !== "active",
  });
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;

  // Same reasoning as the product detail page: a fetch failure and "no such category" need to
  // look different to the visitor, so this is caught explicitly rather than left to notFound()/
  // an uncaught throw to sort out.
  let category;
  try {
    category = await loadCategory(slug);
  } catch {
    return (
      <Container className="py-16">
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertDescription>Couldn&apos;t load this category right now. Please try again shortly.</AlertDescription>
        </Alert>
      </Container>
    );
  }

  if (!category) notFound();

  let products: Awaited<ReturnType<typeof productsService.listProducts>> = [];
  let productsError = false;
  try {
    const supabase = createStaticSupabaseClient();
    products = await productsService.listProducts(
      supabase,
      { categorySlug: category.slug },
      { limit: FEATURED_PRODUCTS_LIMIT },
    );
  } catch {
    productsError = true;
  }

  return (
    <>
      <JsonLd data={buildCategoryJsonLd(category, products)} />

      <CategoryBanner category={category} />

      <section className="py-16 sm:py-20">
        <Container className="flex flex-col gap-8">
          <Breadcrumbs
            items={[
              { name: "Home", path: "/" },
              { name: "Categories", path: "/categories" },
              { name: category.name, path: ROUTES.category(category.slug) },
            ]}
          />
          <SectionTitle title={`${category.name} products`} align="center" className="items-center" />

          {productsError ? (
            <Alert variant="destructive" className="mx-auto max-w-md">
              <AlertTriangle />
              <AlertDescription>Couldn&apos;t load products right now. Please try again shortly.</AlertDescription>
            </Alert>
          ) : (
            <>
              <ProductGrid products={products} emptyMessage="No products in this category yet — check back soon." />
              {products.length > 0 && (
                <Button asChild variant="outline" className="mx-auto">
                  <Link href={ROUTES.productsByCategory(category.slug)}>View all in Shop</Link>
                </Button>
              )}
            </>
          )}
        </Container>
      </section>

      <CategoryFaq categoryName={category.name} />
    </>
  );
}
