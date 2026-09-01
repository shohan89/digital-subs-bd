import type { Metadata } from "next";
import Link from "next/link";
import { LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";
import { ROUTES } from "@/constants/routes";
import { NOINDEX_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = { title: "Sign In Required", robots: NOINDEX_ROBOTS };

/**
 * Not part of normal page navigation — `middleware.ts` and `requireUser()` both redirect an
 * unauthenticated visitor straight to `/login` (with `?redirectTo=`) rather than showing this,
 * per the app's own rule that unauthenticated users land on the login form, not an interstitial.
 * Kept for completeness and for any future caller that can't itself issue a redirect (e.g. an API
 * route responding to a fetch, not a browser navigation).
 */
export default function UnauthorizedPage() {
  return (
    <Container className="flex flex-col items-center gap-4 py-24 text-center">
      <LogIn className="size-12 text-muted-foreground" aria-hidden="true" />
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Sign in required</h1>
      <p className="max-w-md text-sm text-muted-foreground">You need to sign in to view this page.</p>
      <Button asChild className="mt-2">
        <Link href={ROUTES.login}>Sign in</Link>
      </Button>
    </Container>
  );
}
