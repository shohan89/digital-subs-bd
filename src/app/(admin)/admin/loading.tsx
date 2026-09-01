import { Skeleton } from "@/components/ui/skeleton";

/** Fallback for every `/admin/*` route while its Server Component data fetch is in flight — Next
 * wraps `page.tsx` (and any nested segment without its own `loading.tsx`) in a Suspense boundary
 * using this as the fallback, so it renders instantly on navigation instead of a blank page. */
export default function AdminLoading() {
  return (
    <main className="flex-1 p-8">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="mt-2 h-4 w-64" />
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-2">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-8 h-48 w-full" />
    </main>
  );
}
