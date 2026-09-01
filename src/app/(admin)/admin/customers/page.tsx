import type { Metadata } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { AdminCustomerTable, AdminCustomerToolbar } from "@/features/customers/components";
import { adminCustomerFiltersSchema } from "@/features/customers/schemas";
import { requireAdmin } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { customersService } from "@/services";
import type { Customer } from "@/types/customer";

export const metadata: Metadata = { title: "Customers" };

const PER_PAGE = 20;

type AdminCustomersSearchParams = {
  search?: string;
  status?: string;
  page?: string;
};

function buildPageHref(params: AdminCustomersSearchParams, page: number): string {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);
  if (page > 1) query.set("page", String(page));
  const queryString = query.toString();
  return queryString ? `${ROUTES.adminCustomers}?${queryString}` : ROUTES.adminCustomers;
}

/** Admin-only, not staff — user role management lives here (`updateUserRoleAction`), so this page
 * needs its own `requireAdmin()` on top of the `(admin)` layout's `requireStaff()` baseline. */
export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<AdminCustomersSearchParams>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const parsedFilters = adminCustomerFiltersSchema.safeParse({
    search: params.search || undefined,
    status: params.status || undefined,
  });
  const filters = parsedFilters.success ? parsedFilters.data : {};

  let customers: Customer[] = [];
  let hasMore = false;
  let loadError = false;
  try {
    const supabase = await createServerSupabaseClient();
    const offset = (page - 1) * PER_PAGE;
    const fetched = await customersService.listCustomersForAdmin(supabase, filters, { limit: PER_PAGE + 1, offset });
    hasMore = fetched.length > PER_PAGE;
    customers = fetched.slice(0, PER_PAGE);
  } catch (error) {
    unstable_rethrow(error);
    loadError = true;
  }

  return (
    <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-xl font-semibold">Customers</h1>
        <p className="mt-1 text-sm text-muted-foreground">Search, review, and manage customer accounts.</p>
      </div>

      <AdminCustomerToolbar values={{ search: params.search, status: params.status }} />

      {loadError ? (
        <Alert variant="destructive">
          <AlertDescription>Couldn&apos;t load customers right now. Please try again shortly.</AlertDescription>
        </Alert>
      ) : (
        <>
          <AdminCustomerTable customers={customers} />

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
