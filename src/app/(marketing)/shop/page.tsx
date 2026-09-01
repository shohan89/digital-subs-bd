import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { Container } from "@/components/shared/container";
import {
  ProductGrid,
  ProductGridSkeleton,
  ShopFilters,
  ShopSearchBar,
  type ShopFiltersValues,
} from "@/features/products/components";
import type { ProductFilters } from "@/features/products/schemas";
import { PRODUCT_SORTS } from "@/features/products/schemas";
import { buildMetadata, buildShopCanonicalPath } from "@/lib/seo";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { categoriesService, productsService } from "@/services";

const PER_PAGE = 12;

type ShopSearchParams = {
  category?: string;
  search?: string;
  minPrice?: string;
  maxPrice?: string;
  duration?: string;
  sort?: string;
  page?: string;
};

type ShopPageProps = {
  searchParams: Promise<ShopSearchParams>;
};

export async function generateMetadata({ searchParams }: ShopPageProps): Promise<Metadata> {
  const { category, search } = await searchParams;
  const parts = ["Shop"];
  if (search) parts.unshift(`"${search}"`);
  if (category) parts.unshift(category.replace(/-/g, " "));

  return buildMetadata({
    title: parts.join(" — "),
    description: "Browse premium digital subscriptions — streaming, AI tools, design and productivity software.",
    // Collapses every search/sort/pagination permutation to one canonical per category — see
    // `buildShopCanonicalPath`'s doc comment for why `search`/`sort`/`page` never appear here.
    path: buildShopCanonicalPath(category),
  });
}

function parseFilters(params: ShopSearchParams): ProductFilters {
  const sort = PRODUCT_SORTS.find((s) => s === params.sort);
  const duration = params.duration ? Number(params.duration) : undefined;

  return {
    categorySlug: params.category || undefined,
    search: params.search || undefined,
    minPrice: params.minPrice ? Number(params.minPrice) : undefined,
    maxPrice: params.maxPrice ? Number(params.maxPrice) : undefined,
    duration: duration && Number.isFinite(duration) ? duration : undefined,
    sort,
  };
}

function buildPageHref(params: ShopSearchParams, page: number): string {
  const query = new URLSearchParams();
  if (params.category) query.set("category", params.category);
  if (params.search) query.set("search", params.search);
  if (params.minPrice) query.set("minPrice", params.minPrice);
  if (params.maxPrice) query.set("maxPrice", params.maxPrice);
  if (params.duration) query.set("duration", params.duration);
  if (params.sort) query.set("sort", params.sort);
  if (page > 1) query.set("page", String(page));
  const queryString = query.toString();
  return queryString ? `/shop?${queryString}` : "/shop";
}

async function ShopResults({ params }: { params: ShopSearchParams }) {
  const page = Math.max(1, Number(params.page) || 1);
  const filters = parseFilters(params);

  try {
    const supabase = await createServerSupabaseClient();
    const offset = (page - 1) * PER_PAGE;
    // Fetch one extra row to know whether a "Next" page exists, without a separate COUNT query.
    const fetched = await productsService.listProducts(supabase, filters, { limit: PER_PAGE + 1, offset });
    const hasMore = fetched.length > PER_PAGE;
    const products = fetched.slice(0, PER_PAGE);

    return (
      <>
        <ProductGrid
          products={products}
          emptyMessage="No products match your search and filters. Try clearing some of them."
          className="lg:grid-cols-3"
        />

        {(page > 1 || hasMore) && (
          <nav aria-label="Pagination" className="flex justify-center gap-2">
            {page > 1 && (
              <Button asChild variant="outline">
                <Link href={buildPageHref(params, page - 1)}>Previous</Link>
              </Button>
            )}
            {hasMore && (
              <Button asChild variant="outline">
                <Link href={buildPageHref(params, page + 1)}>Next</Link>
              </Button>
            )}
          </nav>
        )}
      </>
    );
  } catch {
    return (
      <Alert variant="destructive">
        <AlertTriangle />
        <AlertDescription>Couldn&apos;t load products right now. Please try again shortly.</AlertDescription>
      </Alert>
    );
  }
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;

  const supabase = await createServerSupabaseClient();
  const categories = await categoriesService.listCategories(supabase).catch(() => []);

  const filterValues: ShopFiltersValues = {
    category: params.category,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    duration: params.duration,
    sort: params.sort,
    search: params.search,
  };

  const activeCategory = params.category ? categories.find((c) => c.slug === params.category) : undefined;
  const breadcrumbItems = activeCategory
    ? [
        { name: "Home", path: "/" },
        { name: "Shop", path: "/shop" },
        { name: activeCategory.name, path: buildShopCanonicalPath(activeCategory.slug) },
      ]
    : [
        { name: "Home", path: "/" },
        { name: "Shop", path: "/shop" },
      ];

  return (
    <Container className="flex flex-col gap-6 py-16">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Shop</h1>
        <p className="text-sm text-muted-foreground">Browse our full catalogue of premium digital subscriptions.</p>
      </div>

      <ShopSearchBar
        defaultValue={params.search}
        hiddenParams={{
          category: params.category,
          minPrice: params.minPrice,
          maxPrice: params.maxPrice,
          duration: params.duration,
          sort: params.sort,
        }}
      />

      <div className="flex flex-col gap-8 lg:flex-row">
        <ShopFilters categories={categories} values={filterValues} />

        <div className="flex flex-1 flex-col gap-6">
          <Suspense fallback={<ProductGridSkeleton />} key={JSON.stringify(params)}>
            <ShopResults params={params} />
          </Suspense>
        </div>
      </div>
    </Container>
  );
}
