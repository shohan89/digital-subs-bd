import "server-only";

import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/types/user";

/** Returns the signed-in user's profile, or `null` if unauthenticated. */
export async function getCurrentUser(): Promise<UserProfile | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  // A disabled account (`customersService.setCustomerDisabled`) is also banned in Supabase Auth,
  // which blocks future sign-ins — but an *already-issued* access token stays valid until it
  // expires or refreshes, since PostgREST/RLS verify the JWT itself rather than calling back to
  // GoTrue per request. This check is what actually cuts off an already-signed-in disabled user's
  // access immediately: `getCurrentUser()` re-fetches `profiles` on every request (no caching), so
  // treating a disabled profile as "not signed in" here takes effect on their very next page
  // load/action, not just their next login attempt.
  if (profile?.disabled) return null;

  return {
    id: user.id,
    email: user.email ?? "",
    fullName: profile?.full_name ?? null,
    phone: profile?.phone ?? null,
    role: profile?.role ?? "customer",
    avatarUrl: profile?.avatar ?? null,
    createdAt: user.created_at,
  };
}

/** Use at the top of protected Server Components/Server Actions. Redirects to /login if unauthenticated. */
export async function requireUser(): Promise<UserProfile> {
  const user = await getCurrentUser();
  if (!user) redirect(ROUTES.login);
  return user;
}

/**
 * Identity checks, not access gates — for conditional UI/logic that needs to know *who* someone
 * is, not enforce whether they're allowed somewhere. Use `requireAdmin()`/`requireStaff()` to
 * actually protect a route or Server Action; these two never redirect on their own, and a `null`
 * user (signed out) reads as `false` for both.
 */
export function isAdmin(user: UserProfile | null): boolean {
  return user?.role === "admin";
}

/** Exactly `role === "manager"` — not "admin or manager". For that combined check, see
 * `requireStaff()`/the `role === "admin" || role === "manager"` shape inline where needed. */
export function isManager(user: UserProfile | null): boolean {
  return user?.role === "manager";
}

/**
 * Use at the top of admin-only Server Components/Server Actions — role management (`/admin/customers`),
 * site-wide config (`/admin/coupons`, `/admin/settings`), and any other page/action a manager
 * should NOT reach. Redirects unauthenticated visitors to /login (via `requireUser()`); redirects
 * anyone signed in but not exactly `admin` (customers *and* managers) to /forbidden.
 *
 * This is the application-layer half of the gate — `profiles`/`coupons`/`settings`'s RLS policies
 * independently enforce the same `admin`-only boundary at the database level (see
 * `supabase/migrations/20260828001600_add_manager_role.sql`), so a bug or an omitted call here
 * can't turn into a real privilege escalation on its own.
 */
export async function requireAdmin(): Promise<UserProfile> {
  const user = await requireUser();
  if (!isAdmin(user)) redirect(ROUTES.forbidden);
  return user;
}

/**
 * Use at the top of *operational* admin Server Components/Server Actions — catalog, orders,
 * payments, subscriptions, reviews: day-to-day work a manager should be able to do without full
 * admin access. Redirects unauthenticated visitors to /login; redirects customers to /forbidden.
 * Admins pass this too (staff = admin or manager).
 *
 * Matches the RLS `is_staff()` helper the operational tables' policies use — see the same
 * migration referenced above. Don't use this to gate `/admin/customers`/`/admin/coupons`/
 * `/admin/settings` or their actions; those need `requireAdmin()`.
 */
export async function requireStaff(): Promise<UserProfile> {
  const user = await requireUser();
  if (!isAdmin(user) && !isManager(user)) redirect(ROUTES.forbidden);
  return user;
}
