import type { Metadata } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { AdminOrderTable, AdminOrderToolbar } from "@/features/orders/components";
import { adminOrderFiltersSchema } from "@/features/orders/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ordersService } from "@/services";
import type { Order } from "@/types/order";

export const metadata: Metadata = { title: "Orders" };

const PER_PAGE = 20;

type AdminOrdersSearchParams = {
  search?: string;
  filterStatus?: string;
  page?: string;
};

function buildPageHref(params: AdminOrdersSearchParams, page: number): string {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.filterStatus) query.set("filterStatus", params.filterStatus);
  if (page > 1) query.set("page", String(page));
  const queryString = query.toString();
  return queryString ? `${ROUTES.adminOrders}?${queryString}` : ROUTES.adminOrders;
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<AdminOrdersSearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const parsedFilters = adminOrderFiltersSchema.safeParse({
    search: params.search || undefined,
    filterStatus: params.filterStatus || undefined,
  });
  const filters = parsedFilters.success ? parsedFilters.data : {};

  let orders: Order[] = [];
  let hasMore = false;
  let loadError = false;
  try {
    const supabase = await createServerSupabaseClient();
    const offset = (page - 1) * PER_PAGE;
    // Fetch one extra row to know whether a "Next" page exists, without a separate COUNT query —
    // same convention as `/shop` and the admin products/categories lists.
    const fetched = await ordersService.listOrdersForAdmin(supabase, filters, { limit: PER_PAGE + 1, offset });
    hasMore = fetched.length > PER_PAGE;
    orders = fetched.slice(0, PER_PAGE);
  } catch (error) {
    unstable_rethrow(error);
    loadError = true;
  }

  return (
    <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-xl font-semibold">Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage customer orders end to end.</p>
      </div>

      <AdminOrderToolbar values={{ search: params.search, filterStatus: params.filterStatus }} />

      {loadError ? (
        <Alert variant="destructive">
          <AlertDescription>Couldn&apos;t load orders right now. Please try again shortly.</AlertDescription>
        </Alert>
      ) : (
        <>
          <AdminOrderTable orders={orders} />

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
