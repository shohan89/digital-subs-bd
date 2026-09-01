"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORY_SORT_LABEL, CATEGORY_SORTS, CATEGORY_STATUSES, CATEGORY_STATUS_LABEL } from "@/constants/categories";
import { ROUTES } from "@/constants/routes";
import { CategoryFormDialog } from "@/features/categories/components/category-form-dialog";
import { useDebounce } from "@/hooks/use-debounce";

// Radix `SelectItem` rejects an empty-string `value` — "no filter" is represented by this
// sentinel and translated back to "omit the param" when building the URL.
const ALL = "all";

export type AdminCategoryToolbarValues = {
  search?: string;
  status?: string;
  sort?: string;
};

function buildHref(values: AdminCategoryToolbarValues): string {
  const query = new URLSearchParams();
  if (values.search) query.set("search", values.search);
  if (values.status) query.set("status", values.status);
  if (values.sort) query.set("sort", values.sort);
  const queryString = query.toString();
  return queryString ? `${ROUTES.adminCategories}?${queryString}` : ROUTES.adminCategories;
}

export function AdminCategoryToolbar({ values }: { values: AdminCategoryToolbarValues }) {
  const router = useRouter();
  const [search, setSearch] = useState(values.search ?? "");
  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    if (debouncedSearch === (values.search ?? "")) return;
    router.push(buildHref({ ...values, search: debouncedSearch || undefined }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  function updateFilter(patch: Partial<AdminCategoryToolbarValues>) {
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
            placeholder="Search categories…"
            aria-label="Search categories"
            className="h-9 pl-8"
          />
        </div>

        <Select value={values.status ?? ALL} onValueChange={(value) => updateFilter({ status: value === ALL ? undefined : value })}>
          <SelectTrigger aria-label="Filter by status" className="w-full sm:w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {CATEGORY_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {CATEGORY_STATUS_LABEL[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={values.sort ?? "name_asc"} onValueChange={(value) => updateFilter({ sort: value })}>
          <SelectTrigger aria-label="Sort categories" className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_SORTS.map((sort) => (
              <SelectItem key={sort} value={sort}>
                {CATEGORY_SORT_LABEL[sort]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <CategoryFormDialog
        trigger={
          <Button>
            <Plus aria-hidden="true" />
            New category
          </Button>
        }
      />
    </div>
  );
}
