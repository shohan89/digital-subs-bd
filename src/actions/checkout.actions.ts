"use server";

import { revalidatePath } from "next/cache";

import { IMAGE_ALLOWED_TYPES, IMAGE_MAX_BYTES } from "@/constants/images";
import { ROUTES } from "@/constants/routes";
import { createCheckoutOrderSchema } from "@/features/checkout/schemas";
import { requireUser } from "@/lib/auth/session";
import { checkRateLimit, rateLimitErrorMessage, rateLimitKeyByUser } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkoutService } from "@/services";
import { actionError, actionSuccess, type ActionResult } from "@/types/api";

/**
 * Takes `FormData` (not a plain object, unlike `orders`/`payments` actions elsewhere) because it
 * carries a `File` — the payment screenshot — alongside the rest of the checkout fields. `items`
 * is JSON-encoded into one field since a cart snapshot doesn't fit `FormData`'s flat key/value
 * shape.
 */
export async function createCheckoutOrderAction(formData: FormData): Promise<ActionResult<{ orderId: string }>> {
  const user = await requireUser();

  // Order creation includes a file upload (the payment screenshot) and writes across
  // orders/order_items/payments — worth throttling against spam regardless of whether the upload
  // itself is otherwise valid.
  const rateLimit = await checkRateLimit(rateLimitKeyByUser("checkout", user.id), { limit: 10, windowSeconds: 60 * 60 });
  if (!rateLimit.allowed) return actionError(rateLimitErrorMessage(rateLimit.retryAfterSeconds));

  let items: unknown;
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return actionError("Invalid cart data");
  }

  const parsed = createCheckoutOrderSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    paymentMethod: formData.get("paymentMethod"),
    transactionId: formData.get("transactionId"),
    items,
    couponCode: formData.get("couponCode") || undefined,
  });
  if (!parsed.success) return actionError("Invalid input", parsed.error.flatten().fieldErrors);

  // Never trust client-side file validation alone — re-check type/size server-side too.
  const screenshot = formData.get("paymentScreenshot");
  if (!(screenshot instanceof File) || screenshot.size === 0) {
    return actionError("Payment screenshot is required", {
      paymentScreenshot: ["Upload a screenshot of your payment"],
    });
  }
  if (!IMAGE_ALLOWED_TYPES.includes(screenshot.type as (typeof IMAGE_ALLOWED_TYPES)[number])) {
    return actionError("Invalid screenshot", { paymentScreenshot: ["Upload a PNG, JPEG, or WEBP image"] });
  }
  if (screenshot.size > IMAGE_MAX_BYTES) {
    return actionError("Screenshot too large", { paymentScreenshot: [`Image must be smaller than ${IMAGE_MAX_BYTES / (1024 * 1024)}MB`] });
  }

  // `checkoutService.placeOrder` writes order -> order_items -> payment (+ a Storage upload) with
  // manual rollback on a failure partway through, deleting the order it just created. Customers
  // have no DELETE policy on `orders` (it's a financial record, not disposable per-user data), so
  // that rollback can't happen through the caller's own RLS-scoped client — hence the service-role
  // client here. `user.id` still comes only from `requireUser()` above, never from client input,
  // so this doesn't let a request act as anyone but the signed-in caller.
  const supabase = createAdminClient();
  try {
    const order = await checkoutService.placeOrder(supabase, user.id, parsed.data, screenshot);
    revalidatePath(ROUTES.dashboardOrders);
    return actionSuccess({ orderId: order.id });
  } catch (error) {
    return actionError(error instanceof Error ? error.message : "Could not place your order. Please try again.");
  }
}
