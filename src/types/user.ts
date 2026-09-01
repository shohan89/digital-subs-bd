/**
 * Three-tier role model, backed by `profiles.role`'s CHECK constraint. `manager` gets real access
 * to operational admin pages/actions (catalog, orders, payments, subscriptions, reviews) — not
 * role management or site-wide config, which stay `admin`-only. See `src/lib/auth/session.ts`'s
 * `requireStaff()`/`requireAdmin()` for the actual gates, and
 * `supabase/migrations/20260828001600_add_manager_role.sql` for the matching RLS.
 */
export type UserRole = "customer" | "manager" | "admin";

export type UserProfile = {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: UserRole;
  avatarUrl: string | null;
  createdAt: string;
};
