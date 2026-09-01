import { LoadingSpinner } from "@/components/shared/loading-spinner";

export default function MarketingLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <LoadingSpinner size="lg" label="Loading page" />
    </div>
  );
}
