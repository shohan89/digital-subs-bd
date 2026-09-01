import { Skeleton } from "@/components/ui/skeleton";

/**
 * Fallback for every `/dashboard/*` route while its Server Component data fetch is in flight —
 * same reasoning as `(admin)/admin/loading.tsx`, but for the customer dashboard, which previously
 * had no `loading.tsx` anywhere in its chain at all (a real gap: `/dashboard`, `/dashboard/orders`,
 * and `/dashboard/subscriptions` all do multi-query fetches with nothing shown in the meantime).
 * Shaped roughly like the overview page (a stat-card row, then a card grid, then a list) since
 * that's this group's most-visited route — not pixel-exact for every sub-page, just close enough
 * that nothing jarring replaces it once real content streams in.
 */
export default function DashboardLoading() {
  return (
    <main className="flex-1 p-8">
      <Skeleton className="h-6 w-56" />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full rounded-xl" />
        ))}
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-40 w-full rounded-xl" />
        ))}
      </div>

      <div className="mt-10 flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </main>
  );
}
