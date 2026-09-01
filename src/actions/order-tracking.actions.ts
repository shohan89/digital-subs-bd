"use server";

import { orderTrackingSchema } from "@/features/order-tracking/schemas";
import { checkRateLimit, rateLimitErrorMessage, rateLimitKeyByIp } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { orderTrackingService } from "@/services";
import { actionError, actionSuccess, type ActionResult } from "@/types/api";
import type { OrderTrackingResult } from "@/types/order-tracking";

const NOT_FOUND_MESSAGE =
  "We couldn't find an order matching that ID and phone number. Double-check both and try again.";

/**
 * No `requireUser()`/`requireAdmin()` — this is a deliberately public, unauthenticated lookup (a
 * customer tracking an order doesn't need to be signed in). The order id + phone number pair
 * *is* the authorization check (enforced in `ordersService.getOrderForTracking`'s query itself,
 * not just in this action), which is why this runs on the service-role client rather than a
 * session-scoped one — there is no session for RLS to scope to.
 *
 * The not-found message is intentionally the same whether the order id doesn't exist at all or
 * exists but the phone doesn't match — never let a response distinguish the two, or this becomes
 * an oracle for probing which order ids are real.
 *
 * Rate-limited by IP: order ids are random UUIDs (impractical to guess), but phone numbers are
 * low-entropy (11-digit BD mobile numbers, a handful of valid prefixes) — an attacker who already
 * has one valid order id (leaked/guessed from a URL, or their own) could otherwise brute-force the
 * phone number against it with no limit.
 */
export async function trackOrderAction(input: unknown): Promise<ActionResult<OrderTrackingResult>> {
  const parsed = orderTrackingSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid input", parsed.error.flatten().fieldErrors);

  const ipLimit = await checkRateLimit(await rateLimitKeyByIp("order-tracking"), { limit: 15, windowSeconds: 10 * 60 });
  if (!ipLimit.allowed) return actionError(rateLimitErrorMessage(ipLimit.retryAfterSeconds));

  const supabase = createAdminClient();
  try {
    const result = await orderTrackingService.trackOrder(supabase, parsed.data.orderId, parsed.data.phone);
    if (!result) return actionError(NOT_FOUND_MESSAGE);
    return actionSuccess(result);
  } catch {
    return actionError("Something went wrong while looking up your order. Please try again.");
  }
}
