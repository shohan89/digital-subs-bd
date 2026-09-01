import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { PRODUCT_SORTS } from "@/features/products/schemas";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/category";

const DURATIONS = [
  { label: "1 Month", days: 30 },
  { label: "3 Months", days: 90 },
  { label: "6 Months", days: 180 },
  { label: "1 Year", days: 365 },
];

const SORT_LABELS: Record<(typeof PRODUCT_SORTS)[number], string> = {
  popular: "Popular",
  price_asc: "Price: Low to High",
  price_desc: "Price: High to Low",
};

const FIELD_CLASS =
  "h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export type ShopFiltersValues = {
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  duration?: string;
  sort?: string;
  search?: string;
};

type FilterFieldsProps = {
  idPrefix: string;
  categories: Category[];
  values: ShopFiltersValues;
};

function FilterFields({ idPrefix, categories, values }: FilterFieldsProps) {
  return (
    <>
      {values.search && <input type="hidden" name="search" value={values.search} />}

      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-category`} className="text-xs font-medium text-muted-foreground">
          Category
        </label>
        <select id={`${idPrefix}-category`} name="category" defaultValue={values.category ?? ""} className={FIELD_CLASS}>
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">Price range (BDT)</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            name="minPrice"
            min={0}
            defaultValue={values.minPrice}
            placeholder="Min"
            aria-label="Minimum price"
            className={cn(FIELD_CLASS, "w-full")}
          />
          <span className="text-muted-foreground">–</span>
          <input
            type="number"
            name="maxPrice"
            min={0}
            defaultValue={values.maxPrice}
            placeholder="Max"
            aria-label="Maximum price"
            className={cn(FIELD_CLASS, "w-full")}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-duration`} className="text-xs font-medium text-muted-foreground">
          Duration
        </label>
        <select id={`${idPrefix}-duration`} name="duration" defaultValue={values.duration ?? ""} className={FIELD_CLASS}>
          <option value="">Any duration</option>
          {DURATIONS.map((duration) => (
            <option key={duration.days} value={duration.days}>
              {duration.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-sort`} className="text-xs font-medium text-muted-foreground">
          Sort by
        </label>
        <select id={`${idPrefix}-sort`} name="sort" defaultValue={values.sort ?? "popular"} className={FIELD_CLASS}>
          {PRODUCT_SORTS.map((value) => (
            <option key={value} value={value}>
              {SORT_LABELS[value]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <Button type="submit">Apply filters</Button>
        {(values.category || values.minPrice || values.maxPrice || values.duration || values.sort) && (
          <Button asChild variant="ghost">
            <Link href={ROUTES.shop}>Clear filters</Link>
          </Button>
        )}
      </div>
    </>
  );
}

type ShopFiltersProps = {
  categories: Category[];
  values: ShopFiltersValues;
};

/**
 * Renders as a sticky sidebar on desktop and a `Sheet` drawer on mobile — two independent
 * `<form>`s (not one form duplicated), so there's no cross-form field-name conflict between the
 * always-in-DOM (CSS-hidden) sidebar and the drawer's content. Each submits via a plain GET, no
 * client JS required for filtering itself; `Sheet` is the only reason this needs any JS at all.
 */
export function ShopFilters({ categories, values }: ShopFiltersProps) {
  return (
    <>
      <form method="get" aria-label="Filter products" className="hidden w-64 shrink-0 flex-col gap-5 lg:flex">
        <FilterFields idPrefix="desktop" categories={categories} values={values} />
      </form>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" className="lg:hidden">
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Filters
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <form method="get" aria-label="Filter products" className="flex flex-col gap-5 px-4">
            <FilterFields idPrefix="mobile" categories={categories} values={values} />
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
