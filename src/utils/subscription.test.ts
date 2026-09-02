import { describe, expect, it } from "vitest";

import { daysUntilExpiry, getSubscriptionStatus, groupSubscriptionsByStatus, isSubscriptionExpired } from "@/utils/subscription";
import type { Subscription } from "@/types/subscription";

// Fixed reference instant so every test is deterministic regardless of when it runs. 1 Sep 2026,
// 20:00 UTC = 2 Sep 2026, 02:00 Bangladesh time (UTC+6) — chosen specifically to land after
// midnight BD time while still being "today" in UTC, so a bug that used the server's ambient
// timezone instead of Bangladesh time (the exact regression this file guards against, see
// utils/timezone.ts's doc comment) would show up as an off-by-one-day failure here.
const NOW = new Date("2026-09-01T20:00:00.000Z");

describe("isSubscriptionExpired", () => {
  it("is false for a future instant", () => {
    expect(isSubscriptionExpired("2026-09-02T00:00:00.000Z", NOW)).toBe(false);
  });

  it("is true for a past instant", () => {
    expect(isSubscriptionExpired("2026-09-01T19:00:00.000Z", NOW)).toBe(true);
  });

  it("is true the instant it expired earlier the same Bangladesh calendar day — the historical bug", () => {
    // 2026-09-02 01:00 BDT (= 2026-09-01 19:00Z) is 1 hour before NOW but the same BD calendar
    // day as NOW (2026-09-02 BDT). A calendar-day-based check would read this as "0 days
    // difference" and wrongly call it not-yet-expired.
    expect(isSubscriptionExpired("2026-09-01T19:00:00.000Z", NOW)).toBe(true);
  });
});

describe("daysUntilExpiry", () => {
  it("is 0 for later today (Bangladesh time)", () => {
    // NOW is 2026-09-02 02:00 BDT; 2026-09-02 23:00 BDT is later the same BD calendar day.
    expect(daysUntilExpiry("2026-09-02T17:00:00.000Z", NOW)).toBe(0);
  });

  it("is 1 for tomorrow (Bangladesh time)", () => {
    expect(daysUntilExpiry("2026-09-03T01:00:00.000Z", NOW)).toBe(1);
  });

  it("is negative for a date in the past", () => {
    expect(daysUntilExpiry("2026-08-30T00:00:00.000Z", NOW)).toBeLessThan(0);
  });
});

describe("getSubscriptionStatus", () => {
  it("returns 'cancelled' regardless of expiry date, even a future one", () => {
    expect(getSubscriptionStatus("2027-01-01T00:00:00.000Z", true, NOW)).toBe("cancelled");
  });

  it("returns 'expired' for a past instant, even if not cancelled", () => {
    expect(getSubscriptionStatus("2026-08-01T00:00:00.000Z", false, NOW)).toBe("expired");
  });

  it("returns 'expired' rather than 'expiring_soon' for something that expired earlier today", () => {
    // The precedence this function's own doc comment calls out: isSubscriptionExpired (instant)
    // is checked before daysUntilExpiry (calendar-day), so "expired 1 hour ago" doesn't fall
    // through to a "0 days left, so expiring soon" read.
    expect(getSubscriptionStatus("2026-09-01T19:00:00.000Z", false, NOW)).toBe("expired");
  });

  it("returns 'expiring_soon' within the warning threshold", () => {
    expect(getSubscriptionStatus("2026-09-03T01:00:00.000Z", false, NOW)).toBe("expiring_soon");
  });

  it("returns 'active' well outside the warning threshold", () => {
    expect(getSubscriptionStatus("2026-12-01T00:00:00.000Z", false, NOW)).toBe("active");
  });
});

describe("groupSubscriptionsByStatus", () => {
  function makeSubscription(overrides: Partial<Subscription>): Subscription {
    return {
      id: "sub-1",
      userId: "user-1",
      productId: "product-1",
      orderId: null,
      customerName: "Test Customer",
      customerEmail: "test@example.com",
      status: "active",
      expiryDate: "2026-12-01T00:00:00.000Z",
      startDate: "2026-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      product: { name: "Test Product", slug: "test-product", image: null },
      ...overrides,
    };
  }

  it("buckets by computed status, not the raw status column, and always includes every key", () => {
    const subscriptions = [
      makeSubscription({ id: "active-1", expiryDate: "2026-12-01T00:00:00.000Z", status: "active" }),
      makeSubscription({ id: "expired-1", expiryDate: "2026-01-01T00:00:00.000Z", status: "active" }),
      makeSubscription({ id: "cancelled-1", expiryDate: "2027-01-01T00:00:00.000Z", status: "cancelled" }),
    ];

    const grouped = groupSubscriptionsByStatus(subscriptions);

    expect(grouped.active.map((s) => s.id)).toEqual(["active-1"]);
    expect(grouped.expired.map((s) => s.id)).toEqual(["expired-1"]);
    expect(grouped.cancelled.map((s) => s.id)).toEqual(["cancelled-1"]);
    expect(grouped.expiring_soon).toEqual([]);
  });
});
