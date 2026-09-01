"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";
import type { OrderStatus } from "@/constants/subscription";
import type { RevenueSeriesByRange } from "@/types/admin";

// `recharts` is a sizeable client-only library (SVG + resize observers) used nowhere else in the
// app — lazy-loaded here rather than bundled into every `/admin/dashboard` request eagerly.
// `ssr: false` is disallowed directly inside a Server Component in the App Router, which is why
// this wrapper exists as its own small Client Component instead of calling `dynamic()` straight
// from `admin/dashboard/page.tsx` — the page itself stays a Server Component either way, and only
// this one file's own bundle (not the page's) pays for the dynamic-import machinery.
const RevenueChart = dynamic(() => import("@/features/admin/components/revenue-chart").then((mod) => mod.RevenueChart), {
  ssr: false,
  loading: () => <Skeleton className="h-80 w-full rounded-xl lg:col-span-2" />,
});

const OrderStatusChart = dynamic(() => import("@/features/admin/components/order-status-chart").then((mod) => mod.OrderStatusChart), {
  ssr: false,
  loading: () => <Skeleton className="h-80 w-full rounded-xl" />,
});

export function DashboardCharts({ revenueSeries, orderStatusCounts }: { revenueSeries: RevenueSeriesByRange; orderStatusCounts: Record<OrderStatus, number> }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <RevenueChart series={revenueSeries} className="lg:col-span-2" />
      <OrderStatusChart counts={orderStatusCounts} />
    </div>
  );
}
