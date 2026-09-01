import type { Metadata } from "next";
import type { PropsWithChildren } from "react";

import { DashboardNav, FloatingWhatsAppButton, Navbar } from "@/components/shared";
import { requireUser } from "@/lib/auth/session";
import { NOINDEX_ROBOTS } from "@/lib/seo";
import { getPublicSettings } from "@/lib/settings";

// Applies to every `/dashboard/*` page at once — an individual customer's own account area, never
// indexable regardless of which sub-page.
export const metadata: Metadata = { robots: NOINDEX_ROBOTS };

/**
 * Protected customer dashboard shell. `requireUser` redirects to /login
 * before any child Server Component renders, so pages under this group
 * never need to re-check auth themselves.
 *
 * Reuses the marketing `Navbar` rather than a dedicated dashboard sidebar (none exists yet — see
 * PROJECT_STRUCTURE.md's "not yet built" list) — this is specifically what puts
 * `NotificationBell` in front of a customer landing here right after checkout, not an attempt at
 * a full dashboard nav redesign. `DashboardNav` (the Overview/Orders/Subscriptions/Notifications/
 * Profile tab strip) is a similarly small, contained addition — not that sidebar either.
 *
 * `FloatingWhatsAppButton` is mounted here too (customer-facing, same as `(marketing)`) — never in
 * `(admin)/layout.tsx`, which isn't this feature's audience.
 */
export default async function DashboardLayout({ children }: PropsWithChildren) {
  await requireUser();
  const settings = await getPublicSettings().catch(() => null);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <DashboardNav />
      {children}
      <FloatingWhatsAppButton phoneNumber={settings?.general.whatsappNumber} />
    </div>
  );
}
