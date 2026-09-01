"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ADMIN_PRODUCT_SORT_LABEL, ADMIN_PRODUCT_SORTS, PRODUCT_STATUSES, PRODUCT_STATUS_LABEL } from "@/constants/products";
import { ROUTES } from "@/constants/routes";
import { useDebounce } from "@/hooks/use-debounce";
import type { Category } from "@/types/category";

// Radix `SelectItem` rejects an empty-string `value`, so "no filter" is represented by this
// sentinel in the UI and translated back to "omit the param" when building the URL.
const ALL = "all";

export type AdminProductToolbarValues = {
  search?: string;
  categoryId?: string;
  status?: string;
  sort?: string;
};

function buildHref(values: AdminProductToolbarValues): string {
  const query = new URLSearchParams();
  if (values.search) query.set("search", values.search);
  if (values.categoryId) query.set("categoryId", values.categoryId);
  if (values.status) query.set("status", values.status);
  if (values.sort) query.set("sort", values.sort);
  const queryString = query.toString();
  return queryString ? `${ROUTES.adminProducts}?${queryString}` : ROUTES.adminProducts;
}

type AdminProductToolbarProps = {
  categories: Category[];
  values: AdminProductToolbarValues;
};

/**
 * Every change here re-navigates `/admin/products` with updated search params — the Server
 * Component page reads those directly, so this component holds no product data itself, just the
 * current filter values (passed back down from the page) and a debounced search input.
 */
export function AdminProductToolbar({ categories, values }: AdminProductToolbarProps) {
  const router = useRouter();
  const [search, setSearch] = useState(values.search ?? "");
  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    if (debouncedSearch === (values.search ?? "")) return;
    router.push(buildHref({ ...values, search: debouncedSearch || undefined }));
    // Only re-run when the debounced value changes — including `values`/`router` would re-fire on
    // every navigation this effect itself causes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  function updateFilter(patch: Partial<AdminProductToolbarValues>) {
    router.push(buildHref({ ...values, ...patch }));
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative flex-1 sm:min-w-56">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search products…"
          aria-label="Search products"
          className="h-9 pl-8"
        />
      </div>

      <Select
        value={values.categoryId ?? ALL}
        onValueChange={(value) => updateFilter({ categoryId: value === ALL ? undefined : value })}
      >
        <SelectTrigger aria-label="Filter by category" className="w-full sm:w-44">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All categories</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={values.status ?? ALL} onValueChange={(value) => updateFilter({ status: value === ALL ? undefined : value })}>
        <SelectTrigger aria-label="Filter by status" className="w-full sm:w-40">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {PRODUCT_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {PRODUCT_STATUS_LABEL[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={values.sort ?? "newest"} onValueChange={(value) => updateFilter({ sort: value })}>
        <SelectTrigger aria-label="Sort products" className="w-full sm:w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ADMIN_PRODUCT_SORTS.map((sort) => (
            <SelectItem key={sort} value={sort}>
              {ADMIN_PRODUCT_SORT_LABEL[sort]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
