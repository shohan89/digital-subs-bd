import type { Metadata } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { AdminSubscriptionTable, AdminSubscriptionToolbar, CreateSubscriptionModal } from "@/features/subscriptions/components";
import { adminSubscriptionFiltersSchema } from "@/features/subscriptions/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { productsService, subscriptionsService } from "@/services";
import type { Subscription } from "@/types/subscription";

export const metadata: Metadata = { title: "Subscriptions" };

const PER_PAGE = 20;

type AdminSubscriptionsSearchParams = {
  search?: string;
  filterStatus?: string;
  sort?: string;
  page?: string;
};

function buildPageHref(params: AdminSubscriptionsSearchParams, page: number): string {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.filterStatus) query.set("filterStatus", params.filterStatus);
  if (params.sort) query.set("sort", params.sort);
  if (page > 1) query.set("page", String(page));
  const queryString = query.toString();
  return queryString ? `${ROUTES.adminSubscriptions}?${queryString}` : ROUTES.adminSubscriptions;
}

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<AdminSubscriptionsSearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const parsedFilters = adminSubscriptionFiltersSchema.safeParse({
    search: params.search || undefined,
    filterStatus: params.filterStatus || undefined,
    sort: params.sort || undefined,
  });
  const filters = parsedFilters.success ? parsedFilters.data : {};

  let subscriptions: Subscription[] = [];
  let hasMore = false;
  let loadError = false;
  let products: { id: string; name: string }[] = [];
  try {
    const supabase = await createServerSupabaseClient();
    const offset = (page - 1) * PER_PAGE;
    const [fetched, allProducts] = await Promise.all([
      subscriptionsService.listSubscriptionsForAdmin(supabase, filters, { limit: PER_PAGE + 1, offset }),
      productsService.listProductsForAdmin(supabase),
    ]);
    hasMore = fetched.length > PER_PAGE;
    subscriptions = fetched.slice(0, PER_PAGE);
    products = allProducts.map((product) => ({ id: product.id, name: product.name }));
  } catch (error) {
    unstable_rethrow(error);
    loadError = true;
  }

  return (
    <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Subscriptions</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage customer access, extensions, and delivery information.</p>
        </div>
        <CreateSubscriptionModal products={products} />
      </div>

      <AdminSubscriptionToolbar values={{ search: params.search, filterStatus: params.filterStatus, sort: params.sort }} />

      {loadError ? (
        <Alert variant="destructive">
          <AlertDescription>Couldn&apos;t load subscriptions right now. Please try again shortly.</AlertDescription>
        </Alert>
      ) : (
        <>
          <AdminSubscriptionTable subscriptions={subscriptions} />

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
