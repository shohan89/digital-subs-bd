"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ADMIN_SUBSCRIPTION_SORT_LABEL, ADMIN_SUBSCRIPTION_SORTS, type AdminSubscriptionSort } from "@/constants/subscriptions";
import { SUBSCRIPTION_STATUS, SUBSCRIPTION_STATUS_LABEL, type SubscriptionStatus } from "@/constants/subscription";
import { ROUTES } from "@/constants/routes";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

export type AdminSubscriptionToolbarValues = {
  search?: string;
  filterStatus?: string;
  sort?: string;
};

function buildHref(values: AdminSubscriptionToolbarValues): string {
  const query = new URLSearchParams();
  if (values.search) query.set("search", values.search);
  if (values.filterStatus) query.set("filterStatus", values.filterStatus);
  if (values.sort) query.set("sort", values.sort);
  const queryString = query.toString();
  return queryString ? `${ROUTES.adminSubscriptions}?${queryString}` : ROUTES.adminSubscriptions;
}

/** Status filter reuses `SUBSCRIPTION_STATUS` directly (Active/Expiring Soon/Expired/Cancelled) —
 * unlike orders, there's no separate "admin filter status" shape here, see
 * `constants/subscriptions.ts`'s doc comment. Tabs (not a `Select`) for the same reasoning as
 * `AdminOrderToolbar`/`AdminPaymentToolbar`: a handful of always-visible, mutually exclusive
 * options read better as tabs and stay bookmarkable/JS-free. Sort gets a `Select` instead — more
 * options, no natural "which one is default" visual hierarchy the way status tabs have. */
export function AdminSubscriptionToolbar({ values }: { values: AdminSubscriptionToolbarValues }) {
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
            placeholder="Search customer name or email…"
            aria-label="Search subscriptions"
            className="h-9 pl-8"
          />
        </div>

        <Select
          value={values.sort ?? "expiry_asc"}
          onValueChange={(sort: AdminSubscriptionSort) => router.push(buildHref({ ...values, sort }))}
        >
          <SelectTrigger aria-label="Sort subscriptions" className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ADMIN_SUBSCRIPTION_SORTS.map((sort) => (
              <SelectItem key={sort} value={sort}>
                {ADMIN_SUBSCRIPTION_SORT_LABEL[sort]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <nav aria-label="Filter subscriptions by status" className="flex flex-wrap gap-1 overflow-x-auto border-b border-border/60">
        <Link
          href={buildHref({ ...values, filterStatus: undefined })}
          aria-current={!values.filterStatus ? "page" : undefined}
          className={cn(
            "shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
            !values.filterStatus ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          All
        </Link>
        {SUBSCRIPTION_STATUS.map((status: SubscriptionStatus) => {
          const isActive = values.filterStatus === status;
          return (
            <Link
              key={status}
              href={buildHref({ ...values, filterStatus: status })}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "shrink-0 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                isActive ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {SUBSCRIPTION_STATUS_LABEL[status]}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
