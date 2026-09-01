import type { Metadata } from "next";
import type { PropsWithChildren } from "react";

import { AdminShell } from "@/components/admin";
import { requireStaff } from "@/lib/auth/session";
import { NOINDEX_ROBOTS } from "@/lib/seo";

// Applies to every `/admin/*` page at once — none of them set their own `robots`, so this is the
// one place that needs it. See `lib/seo.ts`'s `NOINDEX_ROBOTS` doc comment.
export const metadata: Metadata = { robots: NOINDEX_ROBOTS };

/**
 * Protected admin shell — `requireStaff` is the *baseline* gate (admin or manager; redirects
 * customers to /forbidden, unauthenticated visitors to /login), not the only one. The admin-only
 * pages under here (`/admin/customers`, `/admin/coupons`, `/admin/settings`) each additionally
 * call `requireAdmin()` themselves — this layout can't do that gating for just a subset of its
 * children, so don't assume every page under `(admin)` is manager-accessible just because it
 * rendered past this layout.
 *
 * `requireStaff()`'s resolved `UserProfile` (with `role`) is fetched once here, server-side, and
 * handed to `AdminShell` as a prop — the sidebar/header/search all need the caller's role (to hide
 * admin-only nav items from managers) and identity, and every route under here is already dynamic
 * (`ƒ`, per `next build`'s output), so there's no static-generation reason to fetch it client-side
 * the way `NotificationBell` has to.
 */
export default async function AdminLayout({ children }: PropsWithChildren) {
  const user = await requireStaff();

  return <AdminShell user={user}>{children}</AdminShell>;
}
