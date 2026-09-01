import type { AdminCustomerStatusFilter } from "@/constants/customers";
import type { DbClient } from "@/services/types";
import type { Customer, CustomerStats } from "@/types/customer";
import { escapeOrFilterValue } from "@/utils/postgrest";
import { getSubscriptionStatus } from "@/utils/subscription";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw row shape, DbClient is untyped until database.types.ts is generated (see comment there)
function mapCustomer(row: any): Customer {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
    avatarUrl: row.avatar,
    role: row.role,
    disabled: row.disabled,
    createdAt: row.created_at,
  };
}

export type AdminCustomerFilters = {
  search?: string;
  status?: AdminCustomerStatusFilter;
};

export type AdminListCustomersOptions = {
  /** Max rows to return. Same "fetch one extra, slice, check hasMore" contract as every other
   * admin list in this app — pass `pageSize + 1` and handle it yourself. */
  limit?: number;
  offset?: number;
};

/**
 * Admin customer list — search across `full_name`/`email`/`phone` (all real columns on `profiles`,
 * no join needed) and the active/disabled status filter. Runs on the caller's own session-scoped
 * client: `/admin/customers` is `requireAdmin()`-only, and `profiles`' "admin full access" RLS
 * policy already grants that session everything this query needs — no `security definer` RPC
 * required, unlike the `is_staff()`-but-not-`is_admin()` gap other admin lists (subscriptions,
 * dashboard stats) have to work around.
 */
export async function listCustomersForAdmin(
  db: DbClient,
  filters: AdminCustomerFilters = {},
  options: AdminListCustomersOptions = {},
): Promise<Customer[]> {
  let query = db.from("profiles").select("*");

  if (filters.status === "disabled") query = query.eq("disabled", true);
  else if (filters.status === "active") query = query.eq("disabled", false);

  if (filters.search) {
    const term = filters.search.trim();
    if (term) {
      const pattern = escapeOrFilterValue(`%${term}%`);
      query = query.or(`full_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`);
    }
  }

  query = query.order("created_at", { ascending: false });

  if (options.offset !== undefined && options.limit !== undefined) {
    query = query.range(options.offset, options.offset + options.limit - 1);
  } else if (options.limit !== undefined) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapCustomer);
}

export async function getCustomerById(db: DbClient, id: string): Promise<Customer | null> {
  const { data, error } = await db.from("profiles").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapCustomer(data) : null;
}

/**
 * Per-customer order/subscription stats for `/admin/customers/[id]`. Fetches this one customer's
 * orders/subscriptions directly and reduces in JS rather than a `security definer` SQL aggregate
 * like `admin_dashboard_stats()` — that function's own header comment explains *why it* avoids
 * "fetch every row and reduce in JS" (a full-table scan across every order in the store); a single
 * customer's order/subscription history is naturally small, so the same concern doesn't apply
 * here, and this way the "expired" count can reuse `getSubscriptionStatus` directly instead of
 * duplicating its date-comparison logic in SQL.
 *
 * "Total spending" matches `admin_dashboard_stats()`'s `total_revenue` definition — the sum of
 * `total_amount` for `payment_status = 'paid'` orders only, not every order regardless of status.
 */
export async function getCustomerStats(db: DbClient, userId: string): Promise<CustomerStats> {
  const [{ count: totalOrders, error: countError }, { data: paidOrders, error: paidError }, { data: subscriptions, error: subsError }] =
    await Promise.all([
      db.from("orders").select("id", { count: "exact", head: true }).eq("user_id", userId),
      db.from("orders").select("total_amount").eq("user_id", userId).eq("payment_status", "paid"),
      db.from("subscriptions").select("status, expiry_date").eq("user_id", userId),
    ]);
  if (countError) throw countError;
  if (paidError) throw paidError;
  if (subsError) throw subsError;

  const totalSpending = (paidOrders ?? []).reduce((sum, order) => sum + Number(order.total_amount), 0);

  let activeSubscriptions = 0;
  let expiredSubscriptions = 0;
  for (const subscription of subscriptions ?? []) {
    const status = getSubscriptionStatus(subscription.expiry_date, subscription.status === "cancelled");
    if (status === "active" || status === "expiring_soon") activeSubscriptions += 1;
    else if (status === "expired") expiredSubscriptions += 1;
  }

  return { totalOrders: totalOrders ?? 0, totalSpending, activeSubscriptions, expiredSubscriptions };
}

/**
 * Bans/unbans the account in Supabase Auth (`auth.admin.updateUserById` — the only operation in
 * this whole feature that needs the service-role client; GoTrue's admin API has no session-scoped
 * equivalent) and mirrors the result onto `profiles.disabled` in the same call, on the same client.
 * `db` here MUST be `createAdminClient()`, never the caller's session client — pass the right one
 * from the action.
 *
 * A ban blocks *future* sign-ins; it doesn't revoke an already-issued access token (short-lived,
 * verified locally by PostgREST/RLS, not re-checked against GoTrue per request) — see
 * `getCurrentUser()`'s doc comment for the app-layer check that closes that gap for anyone still
 * using an existing session.
 */
export async function setCustomerDisabled(db: DbClient, customerId: string, disabled: boolean): Promise<Customer> {
  const { error: authError } = await db.auth.admin.updateUserById(customerId, {
    ban_duration: disabled ? "876000h" : "none",
  });
  if (authError) throw authError;

  const { data, error } = await db.from("profiles").update({ disabled }).eq("id", customerId).select().single();
  if (error) throw error;
  return mapCustomer(data);
}
