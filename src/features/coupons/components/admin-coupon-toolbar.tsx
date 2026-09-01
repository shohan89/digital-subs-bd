"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ADMIN_COUPON_SORT_LABEL,
  ADMIN_COUPON_SORTS,
  ADMIN_COUPON_STATUS_FILTER_LABEL,
  ADMIN_COUPON_STATUS_FILTERS,
} from "@/constants/coupons";
import { ROUTES } from "@/constants/routes";
import { CouponFormDialog } from "@/features/coupons/components/coupon-form-dialog";
import { useDebounce } from "@/hooks/use-debounce";

// Radix `SelectItem` rejects an empty-string `value` — "no filter" is represented by this
// sentinel and translated back to "omit the param" when building the URL.
const ALL = "all";

export type AdminCouponToolbarValues = {
  search?: string;
  status?: string;
  sort?: string;
};

function buildHref(values: AdminCouponToolbarValues): string {
  const query = new URLSearchParams();
  if (values.search) query.set("search", values.search);
  if (values.status) query.set("status", values.status);
  if (values.sort) query.set("sort", values.sort);
  const queryString = query.toString();
  return queryString ? `${ROUTES.adminCoupons}?${queryString}` : ROUTES.adminCoupons;
}

export function AdminCouponToolbar({ values }: { values: AdminCouponToolbarValues }) {
  const router = useRouter();
  const [search, setSearch] = useState(values.search ?? "");
  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    if (debouncedSearch === (values.search ?? "")) return;
    router.push(buildHref({ ...values, search: debouncedSearch || undefined }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  function updateFilter(patch: Partial<AdminCouponToolbarValues>) {
    router.push(buildHref({ ...values, ...patch }));
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 sm:min-w-56">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by code…"
            aria-label="Search coupons"
            className="h-9 pl-8"
          />
        </div>

        <Select value={values.status ?? ALL} onValueChange={(value) => updateFilter({ status: value === ALL ? undefined : value })}>
          <SelectTrigger aria-label="Filter by status" className="w-full sm:w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {ADMIN_COUPON_STATUS_FILTERS.map((status) => (
              <SelectItem key={status} value={status}>
                {ADMIN_COUPON_STATUS_FILTER_LABEL[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={values.sort ?? "newest"} onValueChange={(value) => updateFilter({ sort: value })}>
          <SelectTrigger aria-label="Sort coupons" className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ADMIN_COUPON_SORTS.map((sort) => (
              <SelectItem key={sort} value={sort}>
                {ADMIN_COUPON_SORT_LABEL[sort]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <CouponFormDialog
        trigger={
          <Button>
            <Plus aria-hidden="true" />
            New coupon
          </Button>
        }
      />
    </div>
  );
}
