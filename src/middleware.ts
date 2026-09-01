import { NextResponse, type NextRequest } from "next/server";

import { AUTH_ROUTES, ROUTES } from "@/constants/routes";
import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_PREFIXES = [ROUTES.dashboard, ROUTES.admin, ROUTES.checkout];

// Admin-only, not staff — a manager hitting one of these gets bounced to /forbidden the same as a
// customer would. Keep this in sync with `requireAdmin()` call sites under `(admin)/admin/*`;
// this is the *first* layer (defense in depth), not the only one — every admin-only page/action
// still calls `requireAdmin()` itself, and the underlying tables' RLS is admin-only too.
const ADMIN_ONLY_PREFIXES = [ROUTES.adminCustomers, ROUTES.adminCoupons, ROUTES.adminSettings];

export async function middleware(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (isProtected && !user) {
    const loginUrl = new URL(ROUTES.login, request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isAdminPath = pathname.startsWith(ROUTES.admin);
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  // Only query `profiles` when the outcome actually depends on role — not on every request.
  if (user && (isAdminPath || isAuthRoute)) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    const role = profile?.role ?? "customer";
    const isStaff = role === "admin" || role === "manager";

    if (isAdminPath) {
      const isAdminOnlyPath = ADMIN_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix));
      if (!isStaff || (isAdminOnlyPath && role !== "admin")) {
        return NextResponse.redirect(new URL(ROUTES.forbidden, request.url));
      }
    }

    if (isAuthRoute) {
      // Rare path (an already-authenticated request landing on /login etc.).
      const target = isStaff ? ROUTES.adminDashboard : ROUTES.dashboard;
      return NextResponse.redirect(new URL(target, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
