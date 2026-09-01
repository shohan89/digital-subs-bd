import * as ordersService from "@/services/orders.service";
import * as paymentsService from "@/services/payments.service";
import * as subscriptionsService from "@/services/subscriptions.service";
import type { DbClient } from "@/services/types";
import type { Order } from "@/types/order";
import type { OrderTrackingResult, TimelineStep } from "@/types/order-tracking";
import type { Payment } from "@/types/payment";

function buildTimeline(order: Order, payment: Payment | null): TimelineStep[] {
  const steps: TimelineStep[] = [
    { key: "order_created", label: "Order Created", state: "complete", timestamp: order.createdAt },
  ];

  // Terminal, unhappy paths first — once cancelled or rejected, nothing further is "current."
  if (order.status === "cancelled") {
    const wasVerified = payment?.status === "verified";
    steps.push({
      key: "payment_verified",
      label: "Payment Verified",
      state: wasVerified ? "complete" : "failed",
      timestamp: wasVerified ? payment.updatedAt : null,
    });
    steps.push({ key: "processing", label: "Processing", state: "failed", timestamp: null });
    steps.push({ key: "delivered", label: "Delivered", state: "upcoming", timestamp: null });
    return steps;
  }

  if (payment?.status === "rejected") {
    // No timestamp here — a rejection time next to a step still labeled "Payment Verified" reads
    // as confusing rather than informative (the `STEP_HINT` text is the point, not a date).
    steps.push({ key: "payment_verified", label: "Payment Verified", state: "failed", timestamp: null });
    steps.push({ key: "processing", label: "Processing", state: "upcoming", timestamp: null });
    steps.push({ key: "delivered", label: "Delivered", state: "upcoming", timestamp: null });
    return steps;
  }

  const paymentVerified = payment?.status === "verified";
  steps.push({
    key: "payment_verified",
    label: "Payment Verified",
    state: paymentVerified ? "complete" : "current",
    timestamp: paymentVerified && payment ? payment.updatedAt : null,
  });

  const isProcessing = order.status === "processing" || order.status === "completed";
  steps.push({
    key: "processing",
    label: "Processing",
    state: isProcessing ? "complete" : paymentVerified ? "current" : "upcoming",
    timestamp: isProcessing ? order.updatedAt : null,
  });

  const isDelivered = order.status === "completed";
  steps.push({
    key: "delivered",
    label: "Delivered",
    state: isDelivered ? "complete" : isProcessing ? "current" : "upcoming",
    timestamp: isDelivered ? order.updatedAt : null,
  });

  return steps;
}

/**
 * Public order-tracking lookup — `db` is expected to be the service-role client here (see
 * `order-tracking.actions.ts`'s doc comment for why: there's no session to scope RLS to for an
 * anonymous "enter your order ID + phone" form). `ordersService.getOrderForTracking` is the actual
 * authorization boundary (exact id + phone match); everything downstream of a successful match
 * just reads more detail about that same, already-verified order.
 */
export async function trackOrder(db: DbClient, orderId: string, phone: string): Promise<OrderTrackingResult | null> {
  const order = await ordersService.getOrderForTracking(db, orderId, phone);
  if (!order) return null;

  const payment = await paymentsService.getPaymentByOrderId(db, order.id);

  // Subscriptions have no `order_id` (see `types/subscription.ts`'s doc comment) — this is a
  // best-effort match to "the most recent subscription for this user+product," not a guaranteed
  // link to *this* order specifically. Fine for a status display; not something to build a hard
  // guarantee on without a schema change.
  const allSubscriptions = await subscriptionsService.listSubscriptionsForUser(db, order.userId);
  const latestSubscriptionByProduct = new Map<string, (typeof allSubscriptions)[number]>();
  for (const subscription of allSubscriptions) {
    const existing = latestSubscriptionByProduct.get(subscription.productId);
    if (!existing || new Date(subscription.createdAt) > new Date(existing.createdAt)) {
      latestSubscriptionByProduct.set(subscription.productId, subscription);
    }
  }

  const uniqueItems = [...new Map(order.items.map((item) => [item.productId, item])).values()];
  const subscriptions = uniqueItems.map((item) => ({
    productId: item.productId,
    productName: item.product?.name ?? "Product",
    subscription: latestSubscriptionByProduct.get(item.productId) ?? null,
  }));

  return { order, payment, subscriptions, timeline: buildTimeline(order, payment) };
}
