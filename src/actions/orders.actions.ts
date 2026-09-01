"use server";

import { revalidatePath } from "next/cache";

import { ROUTES } from "@/constants/routes";
import { updateOrderStatusSchema } from "@/features/orders/schemas";
import { requireStaff } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ordersService } from "@/services";
import { actionError, actionSuccess, type ActionResult } from "@/types/api";
import type { Order } from "@/types/order";

/**
 * Operational (fulfillment status) — staff, not admin-only. Backs all three of "Mark processing"/
 * "Mark completed"/"Cancel order" (just a different target `status`), not three separate actions.
 *
 * Every transition is validated server-side inside `ordersService.changeOrderStatus` against
 * `utils/order-status.ts`'s transition table — this action never calls the raw
 * `updateOrderStatus`, so an invalid transition (moving a cancelled/completed order anywhere, or
 * marking an order processing/completed before its payment is verified) is rejected regardless of
 * what the client sends, not just hidden by which buttons the UI happens to render.
 */
export async function updateOrderStatusAction(input: unknown): Promise<ActionResult<Order>> {
  const staff = await requireStaff();

  const parsed = updateOrderStatusSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid input", parsed.error.flatten().fieldErrors);

  const supabase = await createServerSupabaseClient();
  try {
    const order = await ordersService.changeOrderStatus(supabase, {
      orderId: parsed.data.orderId,
      nextStatus: parsed.data.status,
      actorId: staff.id,
      actorName: staff.fullName ?? staff.email,
      note: parsed.data.note,
    });
    revalidatePath(ROUTES.adminOrders);
    revalidatePath(ROUTES.adminOrderDetail(order.id));
    return actionSuccess(order);
  } catch (error) {
    return actionError(error instanceof Error ? error.message : "Could not update order status");
  }
}
