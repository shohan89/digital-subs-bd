import type { CreateCheckoutOrderInput } from "@/features/checkout/schemas";
import * as couponsService from "@/services/coupons.service";
import * as emailService from "@/services/email/email.service";
import * as notificationsService from "@/services/notifications.service";
import * as orderActivityService from "@/services/order-activity.service";
import * as ordersService from "@/services/orders.service";
import * as paymentsService from "@/services/payments.service";
import * as productsService from "@/services/products.service";
import type { DbClient } from "@/services/types";
import type { Coupon } from "@/types/coupon";
import type { Order } from "@/types/order";

/**
 * The full checkout write: [coupon pre-check] -> order -> order_items -> payment (with the
 * screenshot upload in between) -> [coupon redemption]. Supabase's JS client can't run these
 * across one Postgres transaction, so failures after the order is created are cleaned up by
 * deleting it (`ordersService.deleteOrder`), which cascades to `order_items`/`payments`/
 * `order_activity` — see the comment there. Coupon redemption is deliberately the *last* write in
 * that same rollback-covered sequence, after everything else already succeeded — see
 * `couponsService.redeemCoupon`'s doc comment for why that ordering matters.
 *
 * Pricing is never trusted from `input` — every line is re-priced here from the current
 * `products`/`product_variants` rows, so a tampered client-submitted price can't change what an
 * order is recorded as costing. Same for `input.couponCode`: only the *code* is accepted from the
 * client, never a discount amount — the actual discount is computed here, twice (a read-only
 * pre-check before any write, then re-derived from scratch inside the atomic redemption call).
 */
export async function placeOrder(db: DbClient, userId: string, input: CreateCheckoutOrderInput, screenshot: File): Promise<Order> {
  const productIds = [...new Set(input.items.map((item) => item.productId))];
  const variantIds = [...new Set(input.items.flatMap((item) => (item.variantId ? [item.variantId] : [])))];

  const [products, variants] = await Promise.all([
    productsService.getProductsByIds(db, productIds),
    productsService.getVariantsByIds(db, variantIds),
  ]);
  const productById = new Map(products.map((product) => [product.id, product]));
  const variantById = new Map(variants.map((variant) => [variant.id, variant]));

  const orderItems = input.items.map((item) => {
    const product = productById.get(item.productId);
    if (!product) {
      throw new Error("One or more items in your cart are no longer available. Please review your cart and try again.");
    }

    let price = product.price;
    if (item.variantId) {
      const variant = variantById.get(item.variantId);
      if (!variant || variant.productId !== item.productId) {
        throw new Error("One or more items in your cart are no longer available. Please review your cart and try again.");
      }
      price = variant.price;
    }

    return { productId: item.productId, quantity: item.quantity, price };
  });

  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Read-only pre-check — fails fast, before any write, on an obviously-bad code. Not itself the
  // enforcement boundary for usage-limit correctness; see `redeemCoupon` below for that.
  let appliedCoupon: Coupon | null = null;
  let discountAmount = 0;
  if (input.couponCode) {
    const result = await couponsService.validateCoupon(db, input.couponCode, userId, subtotal);
    appliedCoupon = result.coupon;
    discountAmount = result.discountAmount;
  }

  const totalAmount = subtotal - discountAmount;

  const order = await ordersService.createOrder(db, {
    userId,
    totalAmount,
    discountAmount,
    couponCode: appliedCoupon?.code,
    customerName: input.name,
    customerEmail: input.email,
    customerPhone: input.phone,
  });

  try {
    await ordersService.createOrderItems(db, order.id, orderItems);

    const screenshotPath = await paymentsService.uploadPaymentScreenshot(db, order.id, screenshot);

    try {
      await paymentsService.createPayment(db, {
        orderId: order.id,
        method: input.paymentMethod,
        transactionId: input.transactionId,
        screenshot: screenshotPath,
      });
      // No `actorId`/`actorName` — customer-triggered, same as `order_created`.
      await orderActivityService.recordActivity(db, {
        orderId: order.id,
        actorId: null,
        actorName: null,
        action: "payment_submitted",
        newStatus: "pending",
      });

      // Last write in the sequence, deliberately — everything else already succeeded, so if this
      // atomic claim fails (e.g. the coupon's usage limit was raced past between the pre-check
      // above and now), the outer catch below rolls back the *entire* order rather than leaving a
      // half-applied discount.
      if (appliedCoupon) {
        await couponsService.redeemCoupon(db, {
          couponId: appliedCoupon.id,
          userId,
          orderId: order.id,
          discountAmount,
        });
      }
    } catch (error) {
      await paymentsService.deletePaymentScreenshot(db, screenshotPath);
      throw error;
    }
  } catch (error) {
    await ordersService.deleteOrder(db, order.id).catch(() => {});
    throw error;
  }

  // Notified only now, after the entire write sequence (order, items, payment, coupon
  // redemption) has committed — anything that throws above rolls the order back by deleting it,
  // and a notification referencing a since-deleted order would be a dangling, confusing one.
  // Wrapped non-fatal, same as `notifyReviewer`: the order itself already succeeded, so a
  // notification failure here shouldn't turn into a false "could not place your order" error.
  try {
    const productNames = [...new Set(orderItems.map((item) => productById.get(item.productId)?.name).filter(Boolean))].join(", ");
    const orderLabel = order.id.slice(0, 8);
    // Fetched once and reused for both `notifyStaff` calls below, rather than each re-querying
    // `profiles` — same "fetch the staff list once per sweep" reasoning as
    // `syncSubscriptionLifecycleNotifications`.
    const staffIds = await notificationsService.getStaffIds(db);

    await notificationsService.createNotificationIfNotExists(db, {
      userId,
      type: "order_received",
      title: "Order received",
      message: `We've received your order for ${productNames || "your items"} (order ${orderLabel}).`,
      relatedId: order.id,
    });
    await notificationsService.notifyStaff(
      db,
      {
        type: "new_order",
        title: "New order",
        message: `A new order (${orderLabel}) was placed for ${productNames || "items"}.`,
        relatedId: order.id,
      },
      staffIds,
    );
    await notificationsService.createNotificationIfNotExists(db, {
      userId,
      type: "payment_submitted",
      title: "Payment submitted",
      message: `Your payment for order ${orderLabel} was submitted and is awaiting verification.`,
      relatedId: order.id,
    });
    await notificationsService.notifyStaff(
      db,
      {
        type: "new_payment_submission",
        title: "New payment submission",
        message: `A payment for order ${orderLabel} is awaiting verification.`,
        relatedId: order.id,
      },
      staffIds,
    );

    // Same non-fatal reasoning as the in-app notifications above — `emailService`'s functions
    // never throw on their own, but the whole block still stays inside this try since it's part
    // of the same "notify, don't fail the order over it" step.
    const emailItems = orderItems.map((item) => ({ name: productById.get(item.productId)?.name ?? "Item", quantity: item.quantity, price: item.price }));
    await emailService.sendOrderConfirmationEmail(
      { email: input.email, name: input.name },
      { customerName: input.name, orderId: order.id, items: emailItems, subtotal, discountAmount, totalAmount },
    );
    await emailService.sendPaymentReceivedEmail(
      { email: input.email, name: input.name },
      { customerName: input.name, orderId: order.id, method: input.paymentMethod, transactionId: input.transactionId },
    );
  } catch (error) {
    console.error("Failed to send order/payment notifications", error);
  }

  return (await ordersService.getOrderById(db, order.id)) as Order;
}
