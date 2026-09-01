import { Skeleton } from "@/components/ui/skeleton";

/** Shadows `(admin)/admin/loading.tsx`'s generic fallback for this one route — the dashboard's
 * shape (stat grid, two charts, four list sections) is specific enough to deserve its own
 * skeleton instead of the shared placeholder every other still-bare `/admin/*` page uses. */
export default function AdminDashboardLoading() {
  return (
    <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-xl" />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 w-full rounded-xl lg:col-span-2" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>

      <Skeleton className="h-64 w-full rounded-xl" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>

      <Skeleton className="h-64 w-full rounded-xl" />
    </main>
  );
}
