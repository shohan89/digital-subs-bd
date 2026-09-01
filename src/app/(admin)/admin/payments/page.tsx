import type { Metadata } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { AdminPaymentTable, AdminPaymentToolbar } from "@/features/payments/components";
import { PAYMENT_RECORD_STATUS, type PaymentRecordStatus } from "@/constants/subscription";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { paymentsService } from "@/services";
import type { PaymentWithOrder } from "@/types/payment";

function isPaymentRecordStatus(value: string | undefined): value is PaymentRecordStatus {
  return !!value && (PAYMENT_RECORD_STATUS as readonly string[]).includes(value);
}

export const metadata: Metadata = { title: "Payment Verification" };

const PER_PAGE = 20;

type AdminPaymentsSearchParams = {
  status?: string;
  page?: string;
};

function buildPageHref(params: AdminPaymentsSearchParams, page: number): string {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (page > 1) query.set("page", String(page));
  const queryString = query.toString();
  return queryString ? `${ROUTES.adminPayments}?${queryString}` : ROUTES.adminPayments;
}

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<AdminPaymentsSearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const status = isPaymentRecordStatus(params.status) ? params.status : undefined;

  let payments: PaymentWithOrder[] = [];
  let hasMore = false;
  let loadError = false;
  try {
    const supabase = await createServerSupabaseClient();
    const offset = (page - 1) * PER_PAGE;
    // Fetch one extra row to know whether a "Next" page exists, without a separate COUNT query —
    // same convention as the other admin lists.
    const fetched = await paymentsService.listPaymentsForAdmin(supabase, { status }, { limit: PER_PAGE + 1, offset });
    hasMore = fetched.length > PER_PAGE;
    payments = fetched.slice(0, PER_PAGE);
  } catch (error) {
    unstable_rethrow(error);
    loadError = true;
  }

  return (
    <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-xl font-semibold">Payment verification</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review and act on submitted payments.</p>
      </div>

      <AdminPaymentToolbar status={params.status} />

      {loadError ? (
        <Alert variant="destructive">
          <AlertDescription>Couldn&apos;t load payments right now. Please try again shortly.</AlertDescription>
        </Alert>
      ) : (
        <>
          <AdminPaymentTable payments={payments} />

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
