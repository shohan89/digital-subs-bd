"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { REVIEW_RATINGS, REVIEW_STATUS, REVIEW_STATUS_LABEL } from "@/constants/reviews";
import { ROUTES } from "@/constants/routes";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

// Radix `SelectItem` rejects an empty-string `value` — "no rating filter" is this sentinel,
// translated back to "omit the param" when building the URL.
const ALL_RATINGS = "all";

export type AdminReviewToolbarValues = {
  search?: string;
  status?: string;
  rating?: string;
};

function buildHref(values: AdminReviewToolbarValues): string {
  const query = new URLSearchParams();
  if (values.search) query.set("search", values.search);
  if (values.status) query.set("status", values.status);
  if (values.rating) query.set("rating", values.rating);
  const queryString = query.toString();
  return queryString ? `${ROUTES.adminReviews}?${queryString}` : ROUTES.adminReviews;
}

/** Status filter is a row of tabs (same reasoning as `AdminOrderToolbar`/`AdminSubscriptionToolbar`
 * — a handful of always-visible, mutually exclusive options); rating gets a `Select` instead, same
 * as `AdminSubscriptionToolbar`'s sort — five numeric options with no natural tab hierarchy. */
export function AdminReviewToolbar({ values }: { values: AdminReviewToolbarValues }) {
  const router = useRouter();
  const [search, setSearch] = useState(values.search ?? "");
  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    if (debouncedSearch === (values.search ?? "")) return;
    router.push(buildHref({ ...values, search: debouncedSearch || undefined }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-sm sm:flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search reviewer name or email…"
            aria-label="Search reviews"
            className="h-9 pl-8"
          />
        </div>

        <Select
          value={values.rating ?? ALL_RATINGS}
          onValueChange={(rating) => router.push(buildHref({ ...values, rating: rating === ALL_RATINGS ? undefined : rating }))}
        >
          <SelectTrigger aria-label="Filter by rating" className="w-full sm:w-40">
            <SelectValue placeholder="All ratings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_RATINGS}>All ratings</SelectItem>
            {REVIEW_RATINGS.map((rating) => (
              <SelectItem key={rating} value={String(rating)}>
                {rating} star{rating === 1 ? "" : "s"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <nav aria-label="Filter reviews by status" className="flex flex-wrap gap-1 overflow-x-auto border-b border-border/60">
        <Link
          href={buildHref({ ...values, status: undefined })}
          aria-current={!values.status ? "page" : undefined}
          className={cn(
            "shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
            !values.status ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          All
        </Link>
        {REVIEW_STATUS.map((status) => {
          const isActive = values.status === status;
          return (
            <Link
              key={status}
              href={buildHref({ ...values, status })}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "shrink-0 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                isActive ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {REVIEW_STATUS_LABEL[status]}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
