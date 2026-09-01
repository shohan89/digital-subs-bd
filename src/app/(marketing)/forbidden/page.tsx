import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";
import { ROUTES } from "@/constants/routes";
import { getCurrentUser, isAdmin, isManager } from "@/lib/auth/session";
import { NOINDEX_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = { title: "Access Denied", robots: NOINDEX_ROBOTS };

/**
 * Reached from `middleware.ts` (customer hitting `/admin/*`, manager hitting an admin-only path)
 * and from `requireAdmin()`/`requireStaff()` directly (the same checks, for a request middleware
 * didn't catch). Always an *authenticated* visitor with the wrong role — an unauthenticated one is
 * redirected to `/login` instead, per this app's rule; see `ROUTES.unauthorized`'s doc comment for
 * why that page exists separately and isn't used for this case.
 */
export default async function ForbiddenPage() {
  const user = await getCurrentUser();
  const backHref = user && (isAdmin(user) || isManager(user)) ? ROUTES.adminDashboard : ROUTES.dashboard;

  return (
    <Container className="flex flex-col items-center gap-4 py-24 text-center">
      <ShieldAlert className="size-12 text-destructive" aria-hidden="true" />
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Access denied</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        You don&apos;t have permission to view this page. If you think this is a mistake, contact
        an administrator.
      </p>
      <Button asChild className="mt-2">
        <Link href={user ? backHref : ROUTES.home}>{user ? "Back to dashboard" : "Back home"}</Link>
      </Button>
    </Container>
  );
}
