import { Container } from "@/components/shared/container";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductGridSkeleton } from "@/features/products/components";

export default function ShopLoading() {
  return (
    <Container className="flex flex-col gap-6 py-16">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-72" />
      </div>

      <Skeleton className="h-10 w-full" />

      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="hidden w-64 shrink-0 flex-col gap-5 lg:flex" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>

        <div className="flex-1">
          <ProductGridSkeleton />
        </div>
      </div>
    </Container>
  );
}
