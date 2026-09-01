"use server";

import { revalidatePath } from "next/cache";

import { ROUTES } from "@/constants/routes";
import { approvePaymentSchema, rejectPaymentSchema } from "@/features/payments/schemas";
import { requireStaff } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { emailService, ordersService, paymentsService, paymentVerificationService } from "@/services";
import { actionError, actionSuccess, type ActionResult } from "@/types/api";

/**
 * Payment-approved/rejected emails need the order's customer name/email/items, which
 * `paymentVerificationService.approvePayment`/`rejectPayment` don't return (just
 * `{paymentId, orderId}` — see their doc comments). One extra read here, same session-scoped
 * client, rather than widening those RPC wrappers' return shape for an email-only concern.
 * Non-fatal, same reasoning as every other notification send in this app: the approve/reject
 * decision already committed by the time this runs.
 */
async function notifyPaymentDecision(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  orderId: string,
  decision: "approved" | "rejected",
  reason?: string,
) {
  try {
    const order = await ordersService.getOrderById(supabase, orderId);
    if (!order) return;

    if (decision === "approved") {
      const productNames = [...new Set(order.items.map((item) => item.product?.name).filter(Boolean))].join(", ");
      await emailService.sendPaymentApprovedEmail(
        { email: order.customerEmail, name: order.customerName },
        { customerName: order.customerName, orderId: order.id, productNames },
      );
    } else {
      await emailService.sendPaymentRejectedEmail(
        { email: order.customerEmail, name: order.customerName },
        { customerName: order.customerName, orderId: order.id, reason },
      );
    }
  } catch (error) {
    console.error(`Failed to send payment-${decision} email`, error);
  }
}

export async function approvePaymentAction(input: unknown): Promise<ActionResult> {
  const staff = await requireStaff();

  const parsed = approvePaymentSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid input", parsed.error.flatten().fieldErrors);

  const supabase = await createServerSupabaseClient();
  try {
    const result = await paymentVerificationService.approvePayment(supabase, parsed.data.paymentId, {
      id: staff.id,
      name: staff.fullName ?? staff.email,
    });
    await notifyPaymentDecision(supabase, result.orderId, "approved");
    revalidatePath(ROUTES.adminPayments);
    revalidatePath(ROUTES.adminOrders);
    revalidatePath(ROUTES.adminOrderDetail(result.orderId));
    return actionSuccess(undefined);
  } catch (error) {
    return actionError(error instanceof Error ? error.message : "Could not approve this payment");
  }
}

export async function rejectPaymentAction(input: unknown): Promise<ActionResult> {
  const staff = await requireStaff();

  const parsed = rejectPaymentSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid input", parsed.error.flatten().fieldErrors);

  const supabase = await createServerSupabaseClient();
  try {
    const result = await paymentVerificationService.rejectPayment(
      supabase,
      parsed.data.paymentId,
      { id: staff.id, name: staff.fullName ?? staff.email },
      parsed.data.reason,
    );
    await notifyPaymentDecision(supabase, result.orderId, "rejected", parsed.data.reason);
    revalidatePath(ROUTES.adminPayments);
    revalidatePath(ROUTES.adminOrders);
    revalidatePath(ROUTES.adminOrderDetail(result.orderId));
    return actionSuccess(undefined);
  } catch (error) {
    return actionError(error instanceof Error ? error.message : "Could not reject this payment");
  }
}

/**
 * Called from the admin table's "View screenshot" button — generates a fresh short-lived signed
 * URL on demand rather than the page pre-signing one per row up front.
 *
 * Uses the service-role client, not the caller's own session — the `payment-screenshots` bucket
 * has no Storage RLS policies at all (it's designed to only ever be touched by service-role code:
 * `checkoutService.placeOrder`'s upload, and this read), so even a staff session would get denied
 * here even though `requireStaff()` already gates who can call this action.
 */
export async function getPaymentScreenshotUrlAction(paymentId: string): Promise<ActionResult<{ url: string }>> {
  await requireStaff();

  const supabase = createAdminClient();
  try {
    const payment = await paymentsService.getPaymentById(supabase, paymentId);
    if (!payment?.screenshot) return actionError("No screenshot on file for this payment");

    const url = await paymentsService.getScreenshotSignedUrl(supabase, payment.screenshot);
    return actionSuccess({ url });
  } catch (error) {
    return actionError(error instanceof Error ? error.message : "Could not load screenshot");
  }
}
