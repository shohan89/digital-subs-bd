/**
 * Bangladesh Standard Time is a fixed UTC+6 offset with no daylight-saving transitions (true since
 * 2009) — that's what makes "which calendar day is this in Bangladesh" answerable with plain
 * arithmetic, no `Intl`/timezone-database dependency needed. Never derive a calendar day from the
 * server's ambient timezone instead (`date.getDate()`, `differenceInCalendarDays` with no explicit
 * zone, etc.) — that reflects wherever the Node process happens to be running (UTC on most
 * hosting/edge runtimes, but not guaranteed), not Bangladesh, and silently shifts a calendar-day
 * boundary by up to 6 hours depending on deploy target. This was a real bug in
 * `utils/subscription.ts`'s original `getSubscriptionStatus`/`daysUntilExpiry`, fixed by routing
 * every calendar-day calculation through this file instead.
 */
const BANGLADESH_UTC_OFFSET_MS = 6 * 60 * 60 * 1000;

/** The UTC-midnight timestamp of the Bangladesh calendar day `date` falls on — an internal
 * bookkeeping value only, never a real instant (don't return or compare it as one; it exists
 * purely so two of these can be subtracted to get a whole-day difference). */
function bangladeshCalendarDayAnchor(date: Date): number {
  const shifted = new Date(date.getTime() + BANGLADESH_UTC_OFFSET_MS);
  return Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
}

/**
 * Whole calendar days between `date` and `now`, both read as Bangladesh wall-clock dates —
 * positive when `date` is in the future. E.g. 11pm BDT today -> 1am BDT tomorrow is `1`, even
 * though under two hours actually separate them: "N days" in normal conversation ("expiring in 3
 * days") means calendar days from today, not a rolling N*24h window.
 *
 * Deliberately NOT used to decide whether something has *already happened* — comparing two
 * absolute instants (`date.getTime() < now.getTime()`) needs no timezone at all and is what
 * `isSubscriptionExpired` uses instead. Calendar-day math is for human-facing day counts and
 * "within N days" thresholds only.
 */
export function bangladeshCalendarDaysBetween(date: Date | string, now: Date = new Date()): number {
  const target = bangladeshCalendarDayAnchor(typeof date === "string" ? new Date(date) : date);
  const today = bangladeshCalendarDayAnchor(now);
  return Math.round((target - today) / 86_400_000);
}

/**
 * The UTC instant marking the end of the Bangladesh calendar day that is `daysFromNow` days from
 * today (BD time) — an exclusive upper bound: anything with a timestamp before this instant falls
 * within `daysFromNow` BD calendar days of today. Use this to build a database range-query cutoff
 * (`.lte("expiry_date", cutoff.toISOString())`) that agrees exactly with
 * `bangladeshCalendarDaysBetween(x) <= daysFromNow` computed in JS — a plain `addDays(new Date(),
 * n)` duration cutoff does *not* agree with it (it drifts from the calendar-day definition by up
 * to 6 hours, the server-vs-Bangladesh UTC offset), which is exactly the inconsistency this
 * function exists to avoid between a SQL/Postgrest filter and an in-app status badge.
 */
export function bangladeshCalendarDayCutoff(daysFromNow: number, now: Date = new Date()): Date {
  const todayAnchor = bangladeshCalendarDayAnchor(now);
  const cutoffAnchor = todayAnchor + (daysFromNow + 1) * 86_400_000;
  return new Date(cutoffAnchor - BANGLADESH_UTC_OFFSET_MS);
}
