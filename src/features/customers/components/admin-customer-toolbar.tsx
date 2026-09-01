"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { ADMIN_CUSTOMER_STATUS_FILTER_LABEL, ADMIN_CUSTOMER_STATUS_FILTERS } from "@/constants/customers";
import { ROUTES } from "@/constants/routes";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

export type AdminCustomerToolbarValues = {
  search?: string;
  status?: string;
};

function buildHref(values: AdminCustomerToolbarValues): string {
  const query = new URLSearchParams();
  if (values.search) query.set("search", values.search);
  if (values.status) query.set("status", values.status);
  const queryString = query.toString();
  return queryString ? `${ROUTES.adminCustomers}?${queryString}` : ROUTES.adminCustomers;
}

/** Same debounced-search-input + status-tabs shape as every other admin toolbar
 * (`AdminOrderToolbar`/`AdminPaymentToolbar`/`AdminSubscriptionToolbar`). Filter is account status
 * (Active/Disabled), not role — see `constants/customers.ts`'s doc comment for why. */
export function AdminCustomerToolbar({ values }: { values: AdminCustomerToolbarValues }) {
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
          placeholder="Search name, email, or phone…"
          aria-label="Search customers"
          className="h-9 pl-8"
        />
      </div>

      <nav aria-label="Filter customers by status" className="flex flex-wrap gap-1 border-b border-border/60">
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
        {ADMIN_CUSTOMER_STATUS_FILTERS.map((status) => {
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
              {ADMIN_CUSTOMER_STATUS_FILTER_LABEL[status]}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
