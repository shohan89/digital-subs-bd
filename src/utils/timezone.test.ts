import { describe, expect, it } from "vitest";

import { bangladeshCalendarDayCutoff, bangladeshCalendarDaysBetween } from "@/utils/timezone";

describe("bangladeshCalendarDaysBetween", () => {
  it("is 0 for the same Bangladesh calendar day, even hours apart", () => {
    // 2026-09-02 00:30 BDT and 2026-09-02 23:30 BDT are the same BD calendar day.
    const now = new Date("2026-09-01T18:30:00.000Z"); // 2026-09-02 00:30 BDT
    const target = new Date("2026-09-02T17:30:00.000Z"); // 2026-09-02 23:30 BDT
    expect(bangladeshCalendarDaysBetween(target, now)).toBe(0);
  });

  it("is 1 for the next Bangladesh calendar day, even less than 24h apart", () => {
    // 2026-09-02 23:00 BDT -> 2026-09-03 01:00 BDT is under 2 hours but crosses a BD midnight.
    const now = new Date("2026-09-02T17:00:00.000Z"); // 2026-09-02 23:00 BDT
    const target = new Date("2026-09-02T19:00:00.000Z"); // 2026-09-03 01:00 BDT
    expect(bangladeshCalendarDaysBetween(target, now)).toBe(1);
  });

  it("is negative for a past calendar day", () => {
    const now = new Date("2026-09-05T00:00:00.000Z");
    const target = new Date("2026-09-01T00:00:00.000Z");
    expect(bangladeshCalendarDaysBetween(target, now)).toBeLessThan(0);
  });

  it("would disagree with a naive UTC-calendar-day diff right around a BD midnight — the exact historical bug", () => {
    // 2026-09-01 23:30 UTC is 2026-09-02 05:30 BDT — already the next BD calendar day, but still
    // 2026-09-01 in plain UTC terms. A server-ambient-timezone implementation (e.g. running on a
    // UTC host) would compute this as day 0; the Bangladesh-aware version must say day 1.
    const now = new Date("2026-09-01T12:00:00.000Z"); // 2026-09-01 18:00 BDT
    const target = new Date("2026-09-01T23:30:00.000Z"); // 2026-09-02 05:30 BDT
    expect(bangladeshCalendarDaysBetween(target, now)).toBe(1);
  });
});

describe("bangladeshCalendarDayCutoff", () => {
  it("is an exclusive upper bound that agrees with bangladeshCalendarDaysBetween", () => {
    const now = new Date("2026-09-01T10:00:00.000Z");
    const cutoff = bangladeshCalendarDayCutoff(3, now);

    // Anything strictly before the cutoff must satisfy "within 3 BD calendar days"...
    const justBefore = new Date(cutoff.getTime() - 1000);
    expect(bangladeshCalendarDaysBetween(justBefore, now)).toBeLessThanOrEqual(3);

    // ...and the cutoff instant itself must NOT satisfy it (it's the boundary of day 4).
    expect(bangladeshCalendarDaysBetween(cutoff, now)).toBeGreaterThan(3);
  });

  it("0 days from now cuts off at the end of today (Bangladesh time)", () => {
    const now = new Date("2026-09-01T10:00:00.000Z"); // 2026-09-01 16:00 BDT
    const cutoff = bangladeshCalendarDayCutoff(0, now);
    // The cutoff should land within the following 24h window and mark the end of BD "today".
    expect(bangladeshCalendarDaysBetween(cutoff, now)).toBe(1);
  });
});
