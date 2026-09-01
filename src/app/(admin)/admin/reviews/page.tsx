import type { Metadata } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { AdminReviewTable, AdminReviewToolbar } from "@/features/reviews/components";
import { adminReviewFiltersSchema } from "@/features/reviews/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { reviewsService } from "@/services";
import type { AdminReview } from "@/types/review";

export const metadata: Metadata = { title: "Review Moderation" };

const PER_PAGE = 20;

type AdminReviewsSearchParams = {
  search?: string;
  status?: string;
  rating?: string;
  page?: string;
};

function buildPageHref(params: AdminReviewsSearchParams, page: number): string {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);
  if (params.rating) query.set("rating", params.rating);
  if (page > 1) query.set("page", String(page));
  const queryString = query.toString();
  return queryString ? `${ROUTES.adminReviews}?${queryString}` : ROUTES.adminReviews;
}

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<AdminReviewsSearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const parsedFilters = adminReviewFiltersSchema.safeParse({
    search: params.search || undefined,
    status: params.status || undefined,
    rating: params.rating || undefined,
  });
  const filters = parsedFilters.success ? parsedFilters.data : {};

  let reviews: AdminReview[] = [];
  let hasMore = false;
  let loadError = false;
  try {
    const supabase = await createServerSupabaseClient();
    const offset = (page - 1) * PER_PAGE;
    const fetched = await reviewsService.listReviewsForAdmin(supabase, filters, { limit: PER_PAGE + 1, offset });
    hasMore = fetched.length > PER_PAGE;
    reviews = fetched.slice(0, PER_PAGE);
  } catch (error) {
    unstable_rethrow(error);
    loadError = true;
  }

  return (
    <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-xl font-semibold">Review moderation</h1>
        <p className="mt-1 text-sm text-muted-foreground">Approve, hide, or remove customer reviews.</p>
      </div>

      <AdminReviewToolbar values={{ search: params.search, status: params.status, rating: params.rating }} />

      {loadError ? (
        <Alert variant="destructive">
          <AlertDescription>Couldn&apos;t load reviews right now. Please try again shortly.</AlertDescription>
        </Alert>
      ) : (
        <>
          <AdminReviewTable reviews={reviews} />

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
