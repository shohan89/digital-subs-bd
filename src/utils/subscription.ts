import { EXPIRY_WARNING_THRESHOLD_DAYS, SUBSCRIPTION_STATUS, type SubscriptionStatus } from "@/constants/subscription";
import { bangladeshCalendarDaysBetween } from "@/utils/timezone";
import type { Subscription } from "@/types/subscription";

/**
 * Whether `expiresAt`'s exact instant has already passed — a plain timestamp comparison,
 * deliberately NOT calendar-day-based. "In the past" means the moment itself has gone by, which is
 * timezone-agnostic by definition: comparing two absolute instants needs no timezone conversion at
 * all. Using calendar-day math here instead would be a real bug (and was, before this function
 * existed) — a subscription that expired three hours ago *today* would compute a calendar-day
 * difference of `0`, not negative, and get classified as still active/expiring instead of
 * immediately cut off.
 */
export function isSubscriptionExpired(expiresAt: string | Date, now: Date = new Date()): boolean {
  const expiryDate = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  return expiryDate.getTime() < now.getTime();
}

/**
 * Days until `expiresAt`, as calendar days in Bangladesh time (see
 * `bangladeshCalendarDaysBetween`'s doc comment for why calendar days, and why specifically
 * Bangladesh rather than the server's ambient timezone) — negative once expired. This is a display/
 * threshold value ("3 days remaining," "expiring within 7 days"), not derived from or stored
 * anywhere; call this wherever the number is needed instead of caching it; a subscription's
 * days-remaining always changes with the passage of time regardless of any write to the row, so a
 * stored value would go stale the moment it was written.
 */
export function daysUntilExpiry(expiresAt: string | Date, now: Date = new Date()): number {
  return bangladeshCalendarDaysBetween(expiresAt, now);
}

/**
 * Derives display status from `expiresAt` + `cancelled`, independent of any stored `status`
 * column (`subscriptions.status` only ever actually holds `'active'`/`'cancelled'` — see
 * `subscriptions.service.ts`'s own doc comments; `'expiring_soon'`/`'expired'` are computed here,
 * never written to the row). Precedence matters: `cancelled` wins over everything, then the
 * instant-based expiry check (`isSubscriptionExpired`, authoritative — "has this already
 * happened"), then the calendar-day threshold (`daysUntilExpiry`, human-facing — "is this coming
 * up soon"). Checking the instant *before* the calendar-day threshold is what correctly handles a
 * subscription that expired earlier today: `isSubscriptionExpired` catches it immediately, rather
 * than falling through to a calendar-day check that would still read "0 days left" as merely
 * "expiring," not "expired."
 */
export function getSubscriptionStatus(expiresAt: string | Date, cancelled = false, now: Date = new Date()): SubscriptionStatus {
  if (cancelled) return "cancelled";
  if (isSubscriptionExpired(expiresAt, now)) return "expired";
  if (daysUntilExpiry(expiresAt, now) <= EXPIRY_WARNING_THRESHOLD_DAYS) return "expiring_soon";
  return "active";
}

/**
 * Buckets a list of subscriptions by their *computed* status (`getSubscriptionStatus`) — backs
 * `/dashboard/subscriptions`' Active/Expiring Soon/Expired grouped sections. Every key is always
 * present (possibly empty), in a fixed, sensible display order
 * (`SUBSCRIPTION_STATUS` — active, expiring soon, expired, cancelled), so a caller can iterate the
 * object's own keys rather than hardcoding the bucket list a second time.
 */
export function groupSubscriptionsByStatus(subscriptions: Subscription[]): Record<SubscriptionStatus, Subscription[]> {
  const groups = {} as Record<SubscriptionStatus, Subscription[]>;
  for (const status of SUBSCRIPTION_STATUS) groups[status] = [];
  for (const subscription of subscriptions) {
    const status = getSubscriptionStatus(subscription.expiryDate, subscription.status === "cancelled");
    groups[status].push(subscription);
  }
  return groups;
}
