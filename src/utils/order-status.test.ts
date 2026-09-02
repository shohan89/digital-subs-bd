import { describe, expect, it } from "vitest";

import { getAdminOrderFilterStatus, getValidNextStatuses, isValidOrderStatusTransition } from "@/utils/order-status";

describe("getValidNextStatuses / isValidOrderStatusTransition", () => {
  it("allows pending -> processing only once payment is paid", () => {
    expect(isValidOrderStatusTransition("pending", "processing", "paid")).toBe(true);
    expect(isValidOrderStatusTransition("pending", "processing", "pending")).toBe(false);
    expect(isValidOrderStatusTransition("pending", "processing", "failed")).toBe(false);
  });

  it("allows pending -> completed only once payment is paid", () => {
    expect(isValidOrderStatusTransition("pending", "completed", "paid")).toBe(true);
    expect(isValidOrderStatusTransition("pending", "completed", "pending")).toBe(false);
  });

  it("allows cancelling a pending or processing order regardless of payment status", () => {
    expect(isValidOrderStatusTransition("pending", "cancelled", "pending")).toBe(true);
    expect(isValidOrderStatusTransition("pending", "cancelled", "failed")).toBe(true);
    expect(isValidOrderStatusTransition("processing", "cancelled", "pending")).toBe(true);
  });

  it("treats completed and cancelled as terminal — no further transitions", () => {
    expect(getValidNextStatuses("completed", "paid")).toEqual([]);
    expect(getValidNextStatuses("cancelled", "paid")).toEqual([]);
  });

  it("never allows moving backwards (e.g. processing -> pending)", () => {
    expect(isValidOrderStatusTransition("processing", "pending", "paid")).toBe(false);
  });

  it("processing can move to completed once paid, not before", () => {
    expect(isValidOrderStatusTransition("processing", "completed", "paid")).toBe(true);
    expect(isValidOrderStatusTransition("processing", "completed", "pending")).toBe(false);
  });
});

describe("getAdminOrderFilterStatus", () => {
  it("splits pending-with-pending-payment into 'payment_review'", () => {
    expect(getAdminOrderFilterStatus("pending", "pending")).toBe("payment_review");
  });

  it("keeps pending-with-non-pending-payment as 'pending'", () => {
    expect(getAdminOrderFilterStatus("pending", "failed")).toBe("pending");
    expect(getAdminOrderFilterStatus("pending", "paid")).toBe("pending");
  });

  it("passes processing/completed/cancelled through unchanged regardless of payment status", () => {
    expect(getAdminOrderFilterStatus("processing", "pending")).toBe("processing");
    expect(getAdminOrderFilterStatus("completed", "paid")).toBe("completed");
    expect(getAdminOrderFilterStatus("cancelled", "pending")).toBe("cancelled");
  });
});
