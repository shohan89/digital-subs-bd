"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

/** Error boundary for every `/admin/*` route — must be a Client Component (Next.js requirement).
 * Catches render/data-fetch errors thrown by a page Server Component (e.g. an RLS-denied query)
 * without taking down the whole admin shell (`AdminSidebar`/`AdminHeader` stay mounted above it,
 * same as the marketing sections that catch locally per CLAUDE.md instead of throwing to a route
 * boundary — this one's just the last-resort catch for what a page didn't catch itself). */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <AlertTriangle className="size-8 text-destructive" aria-hidden="true" />
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        This section couldn&apos;t load. Try again, or head back to the dashboard.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
        <Button asChild>
          <Link href={ROUTES.adminDashboard}>Back to dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
