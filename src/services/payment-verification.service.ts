import type { DbClient } from "@/services/types";

export type PaymentVerificationActor = { id: string; name: string };

export type PaymentVerificationResult = { paymentId: string; orderId: string };

/**
 * Approves a pending payment — provisions a subscription per distinct product in the order, flips
 * the payment to `verified`, advances the order's fulfillment status to `processing` if it's
 * still `pending`, records the matching `order_activity` entries, and notifies the customer.
 *
 * All of this runs inside `approve_payment()`, a single Postgres function
 * (`supabase/migrations/20260831000200_add_payment_verification_functions.sql`) — one `.rpc()`
 * call is one Postgres transaction, so every write here commits or rolls back together. Duplicate
 * approval is prevented by the function's first statement (a conditional update that atomically
 * claims the payment), not a separate check performed here. Runs on the admin's own
 * session-scoped client — see the migration's doc comment for why this doesn't need
 * `security definer`.
 */
export async function approvePayment(
  db: DbClient,
  paymentId: string,
  actor: PaymentVerificationActor,
): Promise<PaymentVerificationResult> {
  const { data, error } = await db
    .rpc("approve_payment", { p_payment_id: paymentId, p_actor_id: actor.id, p_actor_name: actor.name })
    .single();
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw RPC row shape, DbClient is untyped until database.types.ts is generated (see comment there)
  const row = data as any;
  return { paymentId: row.out_payment_id, orderId: row.out_order_id };
}

/** Rejects a pending payment, records `payment_rejected`, and notifies the customer — same
 * one-transaction shape as `approvePayment`, via `reject_payment()`. No subscription/order-status
 * side effects: a rejected payment just stays rejected, and the order's fulfillment status is
 * left untouched (there's nothing to fulfill yet). */
export async function rejectPayment(
  db: DbClient,
  paymentId: string,
  actor: PaymentVerificationActor,
  reason?: string,
): Promise<PaymentVerificationResult> {
  const { data, error } = await db
    .rpc("reject_payment", { p_payment_id: paymentId, p_actor_id: actor.id, p_actor_name: actor.name, p_reason: reason ?? null })
    .single();
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see approvePayment above
  const row = data as any;
  return { paymentId: row.out_payment_id, orderId: row.out_order_id };
}
