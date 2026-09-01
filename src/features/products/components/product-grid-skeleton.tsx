import { Skeleton } from "@/components/ui/skeleton";

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    // `lg:grid-cols-3`, matching `/shop`'s own `ProductGrid` override (`className="lg:grid-cols-3"`
    // — the sidebar filter panel takes the 4th column's width there) — this skeleton is only ever
    // used on `/shop` (see `shop/loading.tsx` and `shop/page.tsx`'s own Suspense fallback), not
    // `ProductGrid`'s bare default (`lg:grid-cols-4`, used elsewhere with no sidebar).
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-xl ring-1 ring-foreground/10">
          <Skeleton className="aspect-video w-full rounded-t-xl rounded-b-none" />
          <div className="flex flex-col gap-2 px-4 pb-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="mt-2 h-5 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
