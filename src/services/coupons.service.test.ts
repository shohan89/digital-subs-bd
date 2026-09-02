import { describe, expect, it } from "vitest";

import { computeDiscount } from "@/services/coupons.service";
import type { Coupon } from "@/types/coupon";

function makeCoupon(overrides: Partial<Coupon>): Coupon {
  return {
    id: "coupon-1",
    code: "TEST10",
    discountType: "percentage",
    discountValue: 10,
    minOrderAmount: null,
    maxDiscount: null,
    startDate: null,
    expiryDate: null,
    usageLimit: null,
    perUserUsageLimit: null,
    isActive: true,
    usedCount: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("computeDiscount", () => {
  it("computes a plain percentage discount", () => {
    const coupon = makeCoupon({ discountType: "percentage", discountValue: 20 });
    expect(computeDiscount(coupon, 1000)).toBe(200);
  });

  it("computes a plain fixed discount", () => {
    const coupon = makeCoupon({ discountType: "fixed", discountValue: 150 });
    expect(computeDiscount(coupon, 1000)).toBe(150);
  });

  it("caps a percentage discount at maxDiscount", () => {
    const coupon = makeCoupon({ discountType: "percentage", discountValue: 50, maxDiscount: 100 });
    // 50% of 1000 would be 500, but maxDiscount caps it at 100.
    expect(computeDiscount(coupon, 1000)).toBe(100);
  });

  it("clamps a fixed discount larger than the subtotal down to the subtotal — never negative", () => {
    const coupon = makeCoupon({ discountType: "fixed", discountValue: 5000 });
    expect(computeDiscount(coupon, 300)).toBe(300);
  });

  it("clamps to the subtotal even when maxDiscount alone wouldn't", () => {
    const coupon = makeCoupon({ discountType: "fixed", discountValue: 5000, maxDiscount: 4000 });
    expect(computeDiscount(coupon, 300)).toBe(300);
  });
});
