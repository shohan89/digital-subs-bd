import type { Metadata } from "next";
import Link from "next/link";
import { PackageOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { OrderListItem } from "@/features/orders/components";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ordersService } from "@/services";

export const metadata: Metadata = { title: "Your Orders" };

const PER_PAGE = 20;

function buildPageHref(page: number): string {
  return page > 1 ? `${ROUTES.dashboardOrders}?page=${page}` : ROUTES.dashboardOrders;
}

export default async function DashboardOrdersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await requireUser();
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const supabase = await createServerSupabaseClient();
  const offset = (page - 1) * PER_PAGE;
  // Same "fetch one extra row to know if there's a next page" convention as every other paginated
  // list — this used to fetch a customer's *entire* order history unbounded on every visit.
  const fetched = await ordersService.listOrdersForUser(supabase, user.id, { limit: PER_PAGE + 1, offset });
  const hasMore = fetched.length > PER_PAGE;
  const orders = fetched.slice(0, PER_PAGE);

  return (
    <main className="flex-1 p-8">
      <h1 className="text-xl font-semibold">Your orders</h1>

      {orders.length === 0 && page === 1 ? (
        <div className="mt-8 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 py-16 text-center">
          <PackageOpen className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">No orders yet.</p>
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-col gap-3">
            {orders.map((order) => (
              <OrderListItem key={order.id} order={order} />
            ))}
          </div>

          {(page > 1 || hasMore) && (
            <nav aria-label="Pagination" className="mt-6 flex justify-center gap-2">
              {page > 1 && (
                <Button asChild variant="outline">
                  <Link href={buildPageHref(page - 1)}>Previous</Link>
                </Button>
              )}
              {hasMore && (
                <Button asChild variant="outline">
                  <Link href={buildPageHref(page + 1)}>Next</Link>
                </Button>
              )}
            </nav>
          )}
        </>
      )}
    </main>
  );
}
