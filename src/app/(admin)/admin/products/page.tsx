import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AdminProductTable, AdminProductToolbar } from "@/features/products/components";
import { adminProductFiltersSchema } from "@/features/products/schemas";
import { ROUTES } from "@/constants/routes";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { categoriesService, productsService } from "@/services";

export const metadata: Metadata = { title: "Products" };

const PER_PAGE = 20;

type AdminProductsSearchParams = {
  search?: string;
  categoryId?: string;
  status?: string;
  sort?: string;
  page?: string;
};

function buildPageHref(params: AdminProductsSearchParams, page: number): string {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.categoryId) query.set("categoryId", params.categoryId);
  if (params.status) query.set("status", params.status);
  if (params.sort) query.set("sort", params.sort);
  if (page > 1) query.set("page", String(page));
  const queryString = query.toString();
  return queryString ? `${ROUTES.adminProducts}?${queryString}` : ROUTES.adminProducts;
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<AdminProductsSearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const parsedFilters = adminProductFiltersSchema.safeParse({
    search: params.search || undefined,
    categoryId: params.categoryId || undefined,
    status: params.status || undefined,
    sort: params.sort || undefined,
  });
  const filters = parsedFilters.success ? parsedFilters.data : {};

  const supabase = await createServerSupabaseClient();
  // `listCategoriesForAdmin` (no filters = every status), not the now-active-only `listCategories`
  // — the admin toolbar's category filter should still offer a category that's been deactivated,
  // since products can still be assigned to it.
  const categories = await categoriesService.listCategoriesForAdmin(supabase).catch(() => []);

  let products: Awaited<ReturnType<typeof productsService.listProductsForAdmin>> = [];
  let hasMore = false;
  let loadError = false;
  try {
    const offset = (page - 1) * PER_PAGE;
    // Fetch one extra row to know whether a "Next" page exists, without a separate COUNT query —
    // same trick `/shop` uses (see `ShopResults` in `(marketing)/shop/page.tsx`).
    const fetched = await productsService.listProductsForAdmin(supabase, filters, { limit: PER_PAGE + 1, offset });
    hasMore = fetched.length > PER_PAGE;
    products = fetched.slice(0, PER_PAGE);
  } catch {
    loadError = true;
  }

  return (
    <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your product catalogue.</p>
        </div>
        <Button asChild>
          <Link href={ROUTES.adminProductNew}>
            <Plus aria-hidden="true" />
            New product
          </Link>
        </Button>
      </div>

      <AdminProductToolbar
        categories={categories}
        values={{ search: params.search, categoryId: params.categoryId, status: params.status, sort: params.sort }}
      />

      {loadError ? (
        <Alert variant="destructive">
          <AlertDescription>Couldn&apos;t load products right now. Please try again shortly.</AlertDescription>
        </Alert>
      ) : (
        <>
          <AdminProductTable products={products} />

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
      )}
    </main>
  );
}
