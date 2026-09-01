import type { Metadata } from "next";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { AdminCouponTable, AdminCouponToolbar } from "@/features/coupons/components";
import { adminCouponFiltersSchema } from "@/features/coupons/schemas";
import { requireAdmin } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { couponsService } from "@/services";
import type { Coupon } from "@/types/coupon";

export const metadata: Metadata = { title: "Coupons" };

type AdminCouponsSearchParams = {
  search?: string;
  status?: string;
  sort?: string;
};

/** Admin-only, not staff — coupon/promotion configuration has direct revenue impact, so this page
 * needs its own `requireAdmin()` on top of the `(admin)` layout's `requireStaff()` baseline. */
export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<AdminCouponsSearchParams>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const parsedFilters = adminCouponFiltersSchema.safeParse({
    search: params.search || undefined,
    status: params.status || undefined,
    sort: params.sort || undefined,
  });
  const filters = parsedFilters.success ? parsedFilters.data : {};

  const supabase = await createServerSupabaseClient();

  let coupons: Coupon[] = [];
  let loadError = false;
  try {
    coupons = await couponsService.listCouponsForAdmin(supabase, filters);
  } catch {
    loadError = true;
  }

  return (
    <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-xl font-semibold">Coupons</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create and manage discount coupons.</p>
      </div>

      <AdminCouponToolbar values={{ search: params.search, status: params.status, sort: params.sort }} />

      {loadError ? (
        <Alert variant="destructive">
          <AlertDescription>Couldn&apos;t load coupons right now. Please try again shortly.</AlertDescription>
        </Alert>
      ) : (
        <AdminCouponTable coupons={coupons} />
      )}
    </main>
  );
}
