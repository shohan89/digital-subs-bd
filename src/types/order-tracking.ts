import type { Order } from "@/types/order";
import type { Payment } from "@/types/payment";
import type { Subscription } from "@/types/subscription";

export type TimelineStepKey = "order_created" | "payment_verified" | "processing" | "delivered";

export type TimelineStepState = "complete" | "current" | "upcoming" | "failed";

export type TimelineStep = {
  key: TimelineStepKey;
  label: string;
  state: TimelineStepState;
  timestamp: string | null;
};

export type OrderTrackingSubscriptionInfo = {
  productId: string;
  productName: string;
  /** `null` when payment hasn't been verified yet — nothing has provisioned access. */
  subscription: Subscription | null;
};

export type OrderTrackingResult = {
  order: Order;
  payment: Payment | null;
  subscriptions: OrderTrackingSubscriptionInfo[];
  timeline: TimelineStep[];
};
