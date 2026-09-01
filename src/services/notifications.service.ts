import type { NotificationType } from "@/constants/notifications";
import * as emailService from "@/services/email/email.service";
import type { DbClient } from "@/services/types";
import type { Notification } from "@/types/notification";
import { getSubscriptionStatus } from "@/utils/subscription";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw row shape, DbClient is untyped until database.types.ts is generated (see comment there)
function mapNotification(row: any): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    message: row.message,
    read: row.read,
    type: row.type,
    relatedId: row.related_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type ListNotificationsOptions = { limit?: number; offset?: number };

export async function listNotificationsForUser(
  db: DbClient,
  userId: string,
  options: ListNotificationsOptions = {},
): Promise<Notification[]> {
  let query = db.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (options.offset !== undefined && options.limit !== undefined) {
    query = query.range(options.offset, options.offset + options.limit - 1);
  } else if (options.limit !== undefined) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapNotification);
}

export async function getUnreadCount(db: DbClient, userId: string): Promise<number> {
  const { count, error } = await db
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);
  if (error) throw error;
  return count ?? 0;
}

export type CreateNotificationInput = {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  /** The order/subscription/review this notification is about — omit (or pass `null`) only for a
   * notification with no single backing row. */
  relatedId?: string | null;
};

/**
 * No customer INSERT policy on `notifications` — the caller must be a staff session (satisfies
 * `is_staff()`, e.g. `moderateReviewAction`/`paymentVerificationService.approvePayment` notifying
 * a *different* user) or the service-role client. Never call this on behalf of a plain customer
 * session.
 *
 * Deliberately doesn't `.select()` the inserted row back — a staff caller only has an INSERT
 * policy here, not a matching SELECT one (managers can create a notification for another user,
 * but can't read arbitrary users' notifications, unlike admins' broader "full access" policy).
 * Chaining `.select()` would need PostgREST to read the row back as part of the same statement,
 * which fails RLS for a manager caller and rolls back the whole insert — a real bug caught by
 * testing a manager-driven payment approval end to end, not a hypothetical. No caller here uses
 * the return value anyway.
 */
export async function createNotification(db: DbClient, input: CreateNotificationInput): Promise<void> {
  const { error } = await db.from("notifications").insert({
    user_id: input.userId,
    title: input.title,
    message: input.message,
    read: false,
    type: input.type,
    related_id: input.relatedId ?? null,
  });
  if (error) throw error;
}

/**
 * `createNotification`, but a no-op if a notification of the same `(userId, type, relatedId)`
 * already exists — this is what "do not create excessive duplicate notifications" means in code.
 * Use this (not `createNotification` directly) for anything that could plausibly run more than
 * once for the same underlying event: an opportunistic sync on every page load
 * (`syncSubscriptionLifecycleNotifications`), or any trigger a retry/race could repeat.
 * `createNotification` itself stays available for a call site that's already guaranteed to run
 * exactly once per event (e.g. `approve_payment()`'s SQL insert, or `moderateReviewAction`'s
 * status-transition check already preventing a repeat).
 *
 * Returns whether a row was actually inserted — `syncSubscriptionLifecycleNotifications` uses this
 * to gate its "expiring soon"/"expired" emails on the same dedup key, so a repeat page visit that's
 * already notified for a subscription's current lifecycle state doesn't also re-send the email.
 */
export async function createNotificationIfNotExists(db: DbClient, input: CreateNotificationInput): Promise<boolean> {
  let existsQuery = db.from("notifications").select("id").eq("user_id", input.userId).eq("type", input.type);
  existsQuery = input.relatedId ? existsQuery.eq("related_id", input.relatedId) : existsQuery.is("related_id", null);

  const { data, error } = await existsQuery.limit(1).maybeSingle();
  if (error) throw error;
  if (data) return false;

  await createNotification(db, input);
  return true;
}

/** Every enabled admin/manager id (`profiles.role in ('admin','manager')`, excluding `disabled`
 * accounts) — the population `notifyStaff` fans out to. Exposed so a caller looping over several
 * events in one sweep (`syncSubscriptionLifecycleNotifications`) can fetch this list *once* and
 * pass it to every `notifyStaff` call, instead of `notifyStaff` re-querying `profiles` on every
 * iteration. */
export async function getStaffIds(db: DbClient): Promise<string[]> {
  const { data, error } = await db.from("profiles").select("id").in("role", ["admin", "manager"]).eq("disabled", false);
  if (error) throw error;
  return (data ?? []).map((row) => row.id);
}

export type NotifyStaffInput = {
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string | null;
};

/**
 * One notification per staff member, batched — not the one-`SELECT`-plus-one-`INSERT`-per-staff-
 * member loop this used to be (a real N+1 found auditing this app: on a store with, say, 5 staff
 * and 10 subscriptions expiring in one sweep, that was up to 100 round-trips). Now: at most one
 * `SELECT` to find who's already been notified for this exact `(type, relatedId)`, then one bulk
 * `INSERT` for everyone who hasn't.
 *
 * `staffIds` is optional — pass it (via `getStaffIds`) when the caller already has it, so a sweep
 * over several events (`syncSubscriptionLifecycleNotifications`) fetches the staff list once, not
 * once per event. Requires a service-role or already-staff session client, same as
 * `createNotification` — a plain customer session can read neither other users' `profiles` rows
 * nor insert into `notifications`. Dedups per staff member, so calling this again for the same
 * `(type, relatedId)` after a staff member is added later only notifies the new member.
 */
export async function notifyStaff(db: DbClient, input: NotifyStaffInput, staffIds?: string[]): Promise<void> {
  const ids = staffIds ?? (await getStaffIds(db));
  if (ids.length === 0) return;

  let existingQuery = db.from("notifications").select("user_id").eq("type", input.type).in("user_id", ids);
  existingQuery = input.relatedId ? existingQuery.eq("related_id", input.relatedId) : existingQuery.is("related_id", null);
  const { data: existingRows, error: existingError } = await existingQuery;
  if (existingError) throw existingError;

  const alreadyNotified = new Set((existingRows ?? []).map((row) => row.user_id));
  const toNotify = ids.filter((id) => !alreadyNotified.has(id));
  if (toNotify.length === 0) return;

  const { error: insertError } = await db.from("notifications").insert(
    toNotify.map((userId) => ({
      user_id: userId,
      title: input.title,
      message: input.message,
      read: false,
      type: input.type,
      related_id: input.relatedId ?? null,
    })),
  );
  if (!insertError) return;

  // The bulk insert failed (a constraint violation on one row, a transient blip) — fall back to
  // isolated per-staff inserts so one bad row doesn't silently drop every other staff member's
  // notification, the same guarantee the original per-staff loop gave (a real bug fixed once
  // already — see the notification center's own history — don't lose it while fixing the N+1).
  console.error("Bulk staff notification insert failed, falling back to per-staff inserts", insertError);
  for (const userId of toNotify) {
    try {
      await createNotification(db, { userId, title: input.title, message: input.message, type: input.type, relatedId: input.relatedId });
    } catch (staffError) {
      console.error(`Failed to notify staff member ${userId}`, staffError);
    }
  }
}

/** Scoped to `userId` in the query itself (not just relying on RLS) so a caller can never mark
 * another user's notification read even if this ever runs on a client that bypasses RLS. */
export async function markNotificationRead(db: DbClient, notificationId: string, userId: string): Promise<void> {
  const { error } = await db
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function markAllNotificationsRead(db: DbClient, userId: string): Promise<void> {
  const { error } = await db.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
  if (error) throw error;
}

/** Same `userId`-scoped-in-the-query pattern as `markNotificationRead` — never rely on RLS alone
 * to stop a customer deleting another user's notification. */
export async function deleteNotification(db: DbClient, notificationId: string, userId: string): Promise<void> {
  const { error } = await db.from("notifications").delete().eq("id", notificationId).eq("user_id", userId);
  if (error) throw error;
}

export type SyncSubscriptionLifecycleOptions = {
  /** Scope to one customer's subscriptions (a customer-facing page load); omit to sweep every
   * active subscription (an admin page load). */
  userId?: string;
};

/**
 * Opportunistic notification sync for "Subscription expiring"/"Subscription expired" — there is
 * no cron/scheduled job anywhere in this app (see `getSubscriptionStatus`'s doc comment:
 * `subscriptions.status` never transitions to `expiring_soon`/`expired` on its own), so this
 * recomputes status live from `expiryDate` the exact same way every other display of subscription
 * status already does, and creates any newly-due notification. Call this from a page load
 * (`/dashboard`, `/dashboard/subscriptions`, `/admin/dashboard`) with a service-role client —
 * customer sessions can't insert notifications even for themselves, so this always needs
 * `createAdminClient()` regardless of which page triggers it.
 *
 * Only queries `status = 'active'` rows — a `cancelled` subscription's derived status is always
 * `'cancelled'` (see `getSubscriptionStatus`'s precedence), never `expiring_soon`/`expired`, so
 * there's nothing to notify for it.
 *
 * `expiring_soon` notifies both the subscription's own customer and every staff member (matches
 * the admin notification list's "Subscription expiring"); `expired` notifies only the customer —
 * there is no "Subscription expired" entry in the admin notification list. Dedup is by
 * `(user_id, type, related_id)` via `createNotificationIfNotExists`/`notifyStaff`, so revisiting a
 * page that's already notified for a subscription's current lifecycle state is a no-op. A
 * subscription that's extended after already notifying "expiring soon," then approaches expiry
 * again later, won't re-notify under the same dedup key — a deliberate, accepted simplification;
 * deleting the old notification is the escape hatch, not new "reset on extend" logic.
 */
export async function syncSubscriptionLifecycleNotifications(
  db: DbClient,
  options: SyncSubscriptionLifecycleOptions = {},
): Promise<void> {
  let query = db
    .from("subscriptions")
    .select("id, user_id, expiry_date, customer_name, customer_email, product:products(name)")
    .eq("status", "active");
  if (options.userId) query = query.eq("user_id", options.userId);

  const { data, error } = await query;
  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw row shape, DbClient is untyped until database.types.ts is generated (see comment there)
  const rows = (data ?? []) as any[];

  // Fetched once for the whole sweep, not once per expiring subscription inside the loop below —
  // `notifyStaff` accepts a pre-fetched list for exactly this reason (see its own doc comment).
  // Only bothers fetching it at all if something in this sweep will actually need it.
  const needsStaffList = rows.some((row) => getSubscriptionStatus(row.expiry_date, false) === "expiring_soon");
  const staffIds = needsStaffList ? await getStaffIds(db) : [];

  for (const row of rows) {
    const derivedStatus = getSubscriptionStatus(row.expiry_date, false);
    if (derivedStatus !== "expiring_soon" && derivedStatus !== "expired") continue;

    const productName = row.product?.name ?? "A subscription";

    if (derivedStatus === "expiring_soon") {
      const isNew = await createNotificationIfNotExists(db, {
        userId: row.user_id,
        type: "subscription_expiring",
        title: "Subscription expiring soon",
        message: `${productName} expires soon. Renew to avoid any interruption.`,
        relatedId: row.id,
      });
      await notifyStaff(
        db,
        {
          type: "subscription_expiring",
          title: "Subscription expiring soon",
          message: `A customer's subscription to ${productName} expires soon.`,
          relatedId: row.id,
        },
        staffIds,
      );
      // Gated on `isNew`, not sent unconditionally — this function runs on every page load, so
      // without this check a customer revisiting `/dashboard` would get a fresh email every time
      // instead of once when the subscription first crosses into "expiring soon."
      if (isNew && row.customer_email) {
        await emailService.sendSubscriptionExpiringEmail(
          { email: row.customer_email, name: row.customer_name ?? undefined },
          { customerName: row.customer_name ?? "there", productName, expiryDate: row.expiry_date },
        );
      }
    } else {
      const isNew = await createNotificationIfNotExists(db, {
        userId: row.user_id,
        type: "subscription_expired",
        title: "Subscription expired",
        message: `${productName} has expired. Renew to restore access.`,
        relatedId: row.id,
      });
      if (isNew && row.customer_email) {
        await emailService.sendSubscriptionExpiredEmail(
          { email: row.customer_email, name: row.customer_name ?? undefined },
          { customerName: row.customer_name ?? "there", productName },
        );
      }
    }
  }
}
