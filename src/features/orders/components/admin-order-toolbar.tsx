"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { ADMIN_ORDER_FILTER_STATUS_LABEL, ADMIN_ORDER_FILTER_STATUSES } from "@/constants/orders";
import { ROUTES } from "@/constants/routes";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

export type AdminOrderToolbarValues = {
  search?: string;
  filterStatus?: string;
};

function buildHref(values: AdminOrderToolbarValues): string {
  const query = new URLSearchParams();
  if (values.search) query.set("search", values.search);
  if (values.filterStatus) query.set("filterStatus", values.filterStatus);
  const queryString = query.toString();
  return queryString ? `${ROUTES.adminOrders}?${queryString}` : ROUTES.adminOrders;
}

/** Status filter is a row of links (`aria-current="page"` on the active one), not a `Select` —
 * same reasoning as `DashboardNav`'s tab strip: five short, always-visible, mutually exclusive
 * options read better as tabs than a dropdown, and plain links work without JS and stay
 * bookmarkable. Search is debounced and still pushes a URL, matching the product/category
 * toolbars' convention. */
export function AdminOrderToolbar({ values }: { values: AdminOrderToolbarValues }) {
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
      <div className="relative sm:max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search order ID, customer, phone, email…"
          aria-label="Search orders"
          className="h-9 pl-8"
        />
      </div>

      <nav aria-label="Filter orders by status" className="flex flex-wrap gap-1 overflow-x-auto border-b border-border/60">
        <Link
          href={buildHref({ ...values, filterStatus: undefined })}
          aria-current={!values.filterStatus ? "page" : undefined}
          className={cn(
            "shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
            !values.filterStatus
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          All
        </Link>
        {ADMIN_ORDER_FILTER_STATUSES.map((status) => {
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
              {ADMIN_ORDER_FILTER_STATUS_LABEL[status]}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
