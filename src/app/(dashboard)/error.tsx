"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

/**
 * Error boundary for every `/dashboard/*` route — must be a Client Component (Next.js
 * requirement). Same shape as `(admin)/admin/error.tsx`, scoped to this group: `/dashboard`,
 * `/dashboard/orders`, and `/dashboard/subscriptions` all do multi-query fetches with no manual
 * try/catch of their own (unlike most admin/marketing pages), so an uncaught throw here used to
 * propagate all the way to the generic root `error.tsx` with no dashboard-specific context or way
 * back. This catches it at the dashboard boundary instead, `Navbar`/`DashboardNav` stay mounted
 * above it.
 */
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <AlertTriangle className="size-8 text-destructive" aria-hidden="true" />
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        This page couldn&apos;t load. Try again, or head back to your dashboard.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
        <Button asChild>
          <Link href={ROUTES.dashboard}>Back to dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
