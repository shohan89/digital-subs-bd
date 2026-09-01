import type { DbClient } from "@/services/types";
import type { OrderActivity, OrderActivityAction } from "@/types/order-activity";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw row shape, DbClient is untyped until database.types.ts is generated (see comment there)
function mapOrderActivityRow(row: any): OrderActivity {
  return {
    id: row.id,
    orderId: row.order_id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    action: row.action,
    oldStatus: row.old_status,
    newStatus: row.new_status,
    note: row.note,
    createdAt: row.created_at,
  };
}

/**
 * Staff-only — `order_activity`'s RLS has no customer-readable policy (see the migration's
 * comment). Never call this from a code path that renders to a customer; there's no application-
 * layer check here backing that up, only the database policy, so calling it under a *customer's*
 * session-scoped client would just get an empty result (not an error) rather than a clear signal
 * something's wrong — call it only from staff-gated admin pages/actions.
 *
 * Oldest first — a timeline reads top-to-bottom as "what happened, in order," not newest-first
 * like a notification feed.
 */
export async function listActivityForOrder(db: DbClient, orderId: string): Promise<OrderActivity[]> {
  const { data, error } = await db
    .from("order_activity")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapOrderActivityRow);
}

export type RecordActivityInput = {
  orderId: string;
  /** `null` for customer-triggered events (`order_created`, `payment_submitted`) — see
   * `OrderActivity.actorName`'s doc comment. */
  actorId: string | null;
  actorName: string | null;
  action: OrderActivityAction;
  oldStatus?: string | null;
  newStatus?: string | null;
  note?: string | null;
};

export async function recordActivity(db: DbClient, input: RecordActivityInput): Promise<void> {
  const { error } = await db.from("order_activity").insert({
    order_id: input.orderId,
    actor_id: input.actorId,
    actor_name: input.actorName,
    action: input.action,
    old_status: input.oldStatus ?? null,
    new_status: input.newStatus ?? null,
    note: input.note ?? null,
  });
  if (error) throw error;
}
