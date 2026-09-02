import { describe, expect, it } from "vitest";

import { getCouponStatus } from "@/utils/coupon";

const BASE = { isActive: true, startDate: null, expiryDate: null, usageLimit: null, usedCount: 0 };

describe("getCouponStatus", () => {
  it("is 'inactive' when isActive is false, even if the date range would otherwise be valid", () => {
    expect(getCouponStatus({ ...BASE, isActive: false, expiryDate: "2099-01-01T00:00:00.000Z" })).toBe("inactive");
  });

  it("is 'expired' once past the expiry date, even if isActive is still true", () => {
    // is_active doesn't auto-clear on expiry — the admin just hasn't flipped it off yet.
    expect(getCouponStatus({ ...BASE, expiryDate: "2000-01-01T00:00:00.000Z" })).toBe("expired");
  });

  it("is 'limit_reached' once usedCount reaches usageLimit", () => {
    expect(getCouponStatus({ ...BASE, usageLimit: 10, usedCount: 10 })).toBe("limit_reached");
    expect(getCouponStatus({ ...BASE, usageLimit: 10, usedCount: 9 })).toBe("active");
  });

  it("is 'scheduled' when startDate is in the future", () => {
    expect(getCouponStatus({ ...BASE, startDate: "2099-01-01T00:00:00.000Z" })).toBe("scheduled");
  });

  it("is 'active' with no constraints in effect", () => {
    expect(getCouponStatus(BASE)).toBe("active");
  });

  it("checks expiry before the usage limit", () => {
    expect(getCouponStatus({ ...BASE, expiryDate: "2000-01-01T00:00:00.000Z", usageLimit: 10, usedCount: 10 })).toBe("expired");
  });
});
