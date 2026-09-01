import { addDays } from "date-fns";

import type { AdminSubscriptionSort } from "@/constants/subscriptions";
import { EXPIRY_WARNING_THRESHOLD_DAYS, type SubscriptionStatus } from "@/constants/subscription";
import * as subscriptionActivityService from "@/services/subscription-activity.service";
import type { DbClient } from "@/services/types";
import type { Subscription } from "@/types/subscription";
import { escapeOrFilterValue } from "@/utils/postgrest";
import { bangladeshCalendarDayCutoff } from "@/utils/timezone";

const SUBSCRIPTION_SELECT = "*, product:products(name, slug, image)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw row shape, DbClient is untyped until database.types.ts is generated (see comment there)
function mapSubscription(row: any): Subscription {
  return {
    id: row.id,
    userId: row.user_id,
    productId: row.product_id,
    orderId: row.order_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    status: row.status,
    startDate: row.start_date,
    expiryDate: row.expiry_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    product: row.product ? { name: row.product.name, slug: row.product.slug, image: row.product.image } : null,
  };
}

export async function listSubscriptionsForUser(db: DbClient, userId: string): Promise<Subscription[]> {
  const { data, error } = await db
    .from("subscriptions")
    .select(SUBSCRIPTION_SELECT)
    .eq("user_id", userId)
    .order("expiry_date", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapSubscription);
}

/** `withinDays` is a Bangladesh-calendar-day threshold (`bangladeshCalendarDayCutoff`), not a
 * rolling `withinDays * 24h` window — see that function's doc comment for why a plain duration
 * cutoff would silently disagree with `getSubscriptionStatus`'s calendar-day-based badge by up to
 * 6 hours. */
export async function listExpiringSubscriptions(db: DbClient, withinDays: number, limit?: number): Promise<Subscription[]> {
  const cutoff = bangladeshCalendarDayCutoff(withinDays).toISOString();
  let query = db
    .from("subscriptions")
    .select(SUBSCRIPTION_SELECT)
    .lte("expiry_date", cutoff)
    .eq("status", "active")
    .order("expiry_date", { ascending: true });
  if (limit !== undefined) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapSubscription);
}

/** The subscription(s) `approve_payment()` provisioned directly for this order (via the `order_id`
 * column it now sets) — a real link, not `OrderSubscriptionsCard`'s old best-effort match on
 * product id. Empty for an order whose payment hasn't been approved yet. */
export async function listSubscriptionsForOrder(db: DbClient, orderId: string): Promise<Subscription[]> {
  const { data, error } = await db
    .from("subscriptions")
    .select(SUBSCRIPTION_SELECT)
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapSubscription);
}

export async function getSubscriptionById(db: DbClient, id: string): Promise<Subscription | null> {
  const { data, error } = await db.from("subscriptions").select(SUBSCRIPTION_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapSubscription(data) : null;
}

const FULL_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AdminSubscriptionFilters = {
  search?: string;
  /** The 4 computed states (`SUBSCRIPTION_STATUS`) — translated below into a `status`/`expiry_date`
   * `WHERE` clause, not a plain `.eq("status", ...)`, since `expiring_soon`/`expired` are never
   * actually stored (see `getSubscriptionStatus`'s doc comment — nothing transitions the stored
   * `status` column to those values on its own). */
  filterStatus?: SubscriptionStatus;
  sort?: AdminSubscriptionSort;
};

export type AdminListSubscriptionsOptions = {
  /** Max rows to return. Same "fetch one extra, slice, check hasMore" contract as
   * `listOrdersForAdmin`/`listPaymentsForAdmin` — pass `pageSize + 1` and handle it yourself. */
  limit?: number;
  offset?: number;
};

/**
 * Admin subscription list — search, the 4-way computed status filter, sort, and pagination.
 *
 * Search matches a full subscription id exactly, or a partial case-insensitive match against
 * `customer_name`/`customer_email` (both snapshot columns on `subscriptions` itself — see
 * `Subscription.customerName`'s doc comment for why this doesn't join `profiles`). Runs through
 * `escapeOrFilterValue`, same as `listOrdersForAdmin`.
 *
 * The status filter is expressed directly against `expiry_date`/`status` (the only two stored
 * values that matter — the stored `status` column only ever actually holds `'active'` or
 * `'cancelled'` in practice, see `changeSubscriptionStatus... ` functions below) using the same
 * `EXPIRY_WARNING_THRESHOLD_DAYS` cutoff `getSubscriptionStatus` computes with, so a subscription
 * filed under "Expiring Soon" here is exactly the same set of rows that would render that badge.
 */
export async function listSubscriptionsForAdmin(
  db: DbClient,
  filters: AdminSubscriptionFilters = {},
  options: AdminListSubscriptionsOptions = {},
): Promise<Subscription[]> {
  let query = db.from("subscriptions").select(SUBSCRIPTION_SELECT);

  const now = new Date();
  // Bangladesh-calendar-day cutoff, not a plain `addDays` duration — see
  // `bangladeshCalendarDayCutoff`'s doc comment for why this is what keeps this filter and
  // `getSubscriptionStatus`'s badge agreeing on the exact same set of rows.
  const warningCutoff = bangladeshCalendarDayCutoff(EXPIRY_WARNING_THRESHOLD_DAYS, now).toISOString();

  switch (filters.filterStatus) {
    case "cancelled":
      query = query.eq("status", "cancelled");
      break;
    case "expired":
      query = query.neq("status", "cancelled").lt("expiry_date", now.toISOString());
      break;
    case "expiring_soon":
      query = query.neq("status", "cancelled").gte("expiry_date", now.toISOString()).lte("expiry_date", warningCutoff);
      break;
    case "active":
      query = query.neq("status", "cancelled").gt("expiry_date", warningCutoff);
      break;
    default:
      break; // no filter — every status
  }

  if (filters.search) {
    const term = filters.search.trim();
    if (FULL_UUID_PATTERN.test(term)) {
      query = query.eq("id", term);
    } else if (term) {
      const pattern = escapeOrFilterValue(`%${term}%`);
      query = query.or(`customer_name.ilike.${pattern},customer_email.ilike.${pattern}`);
    }
  }

  switch (filters.sort) {
    case "expiry_desc":
      query = query.order("expiry_date", { ascending: false });
      break;
    case "newest":
      query = query.order("created_at", { ascending: false });
      break;
    case "customer_asc":
      query = query.order("customer_name", { ascending: true, nullsFirst: false });
      break;
    default:
      query = query.order("expiry_date", { ascending: true }); // "expiry_asc", also the unset default
  }

  if (options.offset !== undefined && options.limit !== undefined) {
    query = query.range(options.offset, options.offset + options.limit - 1);
  } else if (options.limit !== undefined) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapSubscription);
}

export type SubscriptionActor = { id: string; name: string };

export type CreateSubscriptionInput = {
  customerEmail: string;
  productId: string;
  durationDays: number;
  /** Optional — links the subscription back to an existing order (validated to belong to the
   * resolved customer before being accepted). Omit for a subscription with no order behind it. */
  orderId?: string;
};

/**
 * Manual admin creation — the counterpart to `approve_payment()`'s automatic provisioning, for
 * comp access, migrated customers, or any grant that didn't come through a verified checkout
 * payment. Resolves `customerEmail` to a user id via `find_customer_by_email()` (a `security
 * definer` RPC — see its migration comment for why a plain `profiles` query can't do this from a
 * manager's session), then inserts the subscription and logs `subscription_created`.
 *
 * If `orderId` is given, it's verified to belong to the resolved customer first — a friendlier
 * rejection than a wrong-customer order id silently linking to someone else's order.
 */
export async function createSubscription(db: DbClient, input: CreateSubscriptionInput, actor: SubscriptionActor): Promise<Subscription> {
  const { data: customerRow, error: customerError } = await db
    .rpc("find_customer_by_email", { p_email: input.customerEmail })
    .maybeSingle();
  if (customerError) throw customerError;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw RPC row shape, DbClient is untyped until database.types.ts is generated (see comment there)
  const customer = customerRow as any;
  if (!customer?.out_id) throw new Error(`No customer found with email "${input.customerEmail}".`);

  if (input.orderId) {
    const { data: order, error: orderError } = await db.from("orders").select("user_id").eq("id", input.orderId).maybeSingle();
    if (orderError) throw orderError;
    if (!order) throw new Error("That order id doesn't exist.");
    if (order.user_id !== customer.out_id) throw new Error("That order doesn't belong to this customer.");
  }

  const startDate = new Date();
  const expiryDate = addDays(startDate, input.durationDays);

  const { data, error } = await db
    .from("subscriptions")
    .insert({
      user_id: customer.out_id,
      product_id: input.productId,
      order_id: input.orderId ?? null,
      customer_name: customer.out_full_name,
      customer_email: customer.out_email,
      status: "active",
      start_date: startDate.toISOString(),
      expiry_date: expiryDate.toISOString(),
    })
    .select(SUBSCRIPTION_SELECT)
    .single();
  if (error) throw error;
  const subscription = mapSubscription(data);

  await subscriptionActivityService.recordActivity(db, {
    subscriptionId: subscription.id,
    actorId: actor.id,
    actorName: actor.name,
    action: "subscription_created",
    newValue: subscription.expiryDate,
    note: "Created manually by staff",
  });

  return subscription;
}

/** A subscription can only be extended/have its expiry changed while it isn't cancelled —
 * reactivate first. Shared by `extendSubscription`/`setSubscriptionExpiry` below. */
function assertNotCancelled(subscription: Pick<Subscription, "status">) {
  if (subscription.status === "cancelled") {
    throw new Error("This subscription is cancelled — reactivate it before changing its expiry.");
  }
}

/**
 * Extends a subscription by `days` from its *current* expiry date (or from now, if it already
 * expired — `max(current expiry, now)`, so extending an already-lapsed subscription doesn't start
 * the clock from a past date). Logs `subscription_extended` with the actor and the old/new expiry.
 */
export async function extendSubscription(
  db: DbClient,
  subscriptionId: string,
  days: number,
  actor: SubscriptionActor,
): Promise<Subscription> {
  const existing = await getSubscriptionById(db, subscriptionId);
  if (!existing) throw new Error("Subscription not found");
  assertNotCancelled(existing);

  const base = new Date(Math.max(new Date(existing.expiryDate).getTime(), Date.now()));
  const newExpiry = addDays(base, days);

  const { data, error } = await db
    .from("subscriptions")
    .update({ expiry_date: newExpiry.toISOString() })
    .eq("id", subscriptionId)
    .select(SUBSCRIPTION_SELECT)
    .single();
  if (error) throw error;
  const subscription = mapSubscription(data);

  await subscriptionActivityService.recordActivity(db, {
    subscriptionId,
    actorId: actor.id,
    actorName: actor.name,
    action: "subscription_extended",
    oldValue: existing.expiryDate,
    newValue: subscription.expiryDate,
    note: `+${days} day${days === 1 ? "" : "s"}`,
  });

  return subscription;
}

/** Sets a subscription's expiry to an exact date (as opposed to `extendSubscription`'s relative
 * "+N days") — for correcting a wrong date, backdating, or any change that isn't "add more time." */
export async function setSubscriptionExpiry(
  db: DbClient,
  subscriptionId: string,
  newExpiryDate: string,
  actor: SubscriptionActor,
): Promise<Subscription> {
  const existing = await getSubscriptionById(db, subscriptionId);
  if (!existing) throw new Error("Subscription not found");
  assertNotCancelled(existing);

  const { data, error } = await db
    .from("subscriptions")
    .update({ expiry_date: newExpiryDate })
    .eq("id", subscriptionId)
    .select(SUBSCRIPTION_SELECT)
    .single();
  if (error) throw error;
  const subscription = mapSubscription(data);

  await subscriptionActivityService.recordActivity(db, {
    subscriptionId,
    actorId: actor.id,
    actorName: actor.name,
    action: "expiry_changed",
    oldValue: existing.expiryDate,
    newValue: subscription.expiryDate,
  });

  return subscription;
}

/** The stored `status` column only ever actually holds `'active'` or `'cancelled'` in this app —
 * nothing writes `'expiring_soon'`/`'expired'` to it (those are `getSubscriptionStatus`'s computed
 * display values only). Cancelling/reactivating is effectively a two-state toggle, which is why
 * there's no `utils/subscription-status.ts` transition table the way `orders` has — the only two
 * invalid moves ("cancel an already-cancelled subscription", "reactivate one that isn't
 * cancelled") are guarded inline below instead of via a shared table for two states. */
export async function cancelSubscription(db: DbClient, subscriptionId: string, actor: SubscriptionActor, note?: string): Promise<Subscription> {
  const existing = await getSubscriptionById(db, subscriptionId);
  if (!existing) throw new Error("Subscription not found");
  if (existing.status === "cancelled") throw new Error("This subscription is already cancelled.");

  const { data, error } = await db
    .from("subscriptions")
    .update({ status: "cancelled" })
    .eq("id", subscriptionId)
    .select(SUBSCRIPTION_SELECT)
    .single();
  if (error) throw error;
  const subscription = mapSubscription(data);

  await subscriptionActivityService.recordActivity(db, {
    subscriptionId,
    actorId: actor.id,
    actorName: actor.name,
    action: "subscription_cancelled",
    oldValue: existing.status,
    newValue: "cancelled",
    note: note ?? null,
  });

  return subscription;
}

/** Un-cancels a subscription without touching `expiry_date` — if that date has already passed,
 * `getSubscriptionStatus` will correctly still render it as "Expired," not "Active"; extend it
 * separately if the intent is to actually restore access. */
export async function reactivateSubscription(db: DbClient, subscriptionId: string, actor: SubscriptionActor): Promise<Subscription> {
  const existing = await getSubscriptionById(db, subscriptionId);
  if (!existing) throw new Error("Subscription not found");
  if (existing.status !== "cancelled") throw new Error("This subscription isn't cancelled.");

  const { data, error } = await db
    .from("subscriptions")
    .update({ status: "active" })
    .eq("id", subscriptionId)
    .select(SUBSCRIPTION_SELECT)
    .single();
  if (error) throw error;
  const subscription = mapSubscription(data);

  await subscriptionActivityService.recordActivity(db, {
    subscriptionId,
    actorId: actor.id,
    actorName: actor.name,
    action: "subscription_reactivated",
    oldValue: "cancelled",
    newValue: "active",
  });

  return subscription;
}

export type SubscriptionLifecycleCounts = {
  /** Cumulative, not a discrete 0-3-day bucket — "expiring within 3 days" naturally includes
   * anything expiring even sooner, matching how `listSubscriptionsForAdmin`'s own "Expiring Soon"
   * filter (also a `<=` threshold) already reads. */
  expiringWithin3Days: number;
  /** Also cumulative — includes everything counted in `expiringWithin3Days` too, at a wider
   * horizon. Two independent "how urgent" views, not a mutually-exclusive 4-7-day bucket. */
  expiringWithin7Days: number;
  expired: number;
};

/**
 * Backs `/admin/dashboard`'s subscription-lifecycle widget. Every count excludes cancelled
 * subscriptions (a cancelled-and-technically-past-expiry row isn't meaningfully "expired" for this
 * purpose — `getSubscriptionStatus` gives `cancelled` the same precedence) and uses the same
 * Bangladesh-calendar-day cutoffs as everywhere else in this file, via `bangladeshCalendarDayCutoff`
 * — not `admin_dashboard_stats()`'s old `expiring_soon_subscriptions` field, which was removed:
 * that field counted rows with a literal `status = 'expiring_soon'`, a value nothing in this
 * codebase ever actually writes to `subscriptions.status` (see this file's other doc comments), so
 * it was always zero. Three separate `count`-only queries, not one aggregate SQL call — this
 * table's size doesn't warrant a `security definer` RPC the way `admin_dashboard_stats()`'s
 * store-wide revenue aggregates do, and running on the caller's own session client (`is_staff()`
 * already grants `subscriptions` full access) keeps this consistent with how the rest of this file
 * queries.
 */
export async function getSubscriptionLifecycleCounts(db: DbClient): Promise<SubscriptionLifecycleCounts> {
  const now = new Date();
  const nowIso = now.toISOString();
  const cutoff3 = bangladeshCalendarDayCutoff(3, now).toISOString();
  const cutoff7 = bangladeshCalendarDayCutoff(7, now).toISOString();

  const [within3, within7, expired] = await Promise.all([
    db.from("subscriptions").select("id", { count: "exact", head: true }).neq("status", "cancelled").gte("expiry_date", nowIso).lte("expiry_date", cutoff3),
    db.from("subscriptions").select("id", { count: "exact", head: true }).neq("status", "cancelled").gte("expiry_date", nowIso).lte("expiry_date", cutoff7),
    db.from("subscriptions").select("id", { count: "exact", head: true }).neq("status", "cancelled").lt("expiry_date", nowIso),
  ]);
  if (within3.error) throw within3.error;
  if (within7.error) throw within7.error;
  if (expired.error) throw expired.error;

  return {
    expiringWithin3Days: within3.count ?? 0,
    expiringWithin7Days: within7.count ?? 0,
    expired: expired.count ?? 0,
  };
}
