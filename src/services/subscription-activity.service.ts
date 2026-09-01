import type { DbClient } from "@/services/types";
import type { SubscriptionActivity, SubscriptionActivityAction } from "@/types/subscription-activity";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw row shape, DbClient is untyped until database.types.ts is generated (see comment there)
function mapSubscriptionActivityRow(row: any): SubscriptionActivity {
  return {
    id: row.id,
    subscriptionId: row.subscription_id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    action: row.action,
    oldValue: row.old_value,
    newValue: row.new_value,
    note: row.note,
    createdAt: row.created_at,
  };
}

/**
 * Staff-only — `subscription_activity`'s RLS has no customer-readable policy (mirrors
 * `order_activity`). Never call this from a code path that renders to a customer — call it only
 * from staff-gated admin pages/actions.
 *
 * Oldest first — a timeline reads top-to-bottom as "what happened, in order."
 */
export async function listActivityForSubscription(db: DbClient, subscriptionId: string): Promise<SubscriptionActivity[]> {
  const { data, error } = await db
    .from("subscription_activity")
    .select("*")
    .eq("subscription_id", subscriptionId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapSubscriptionActivityRow);
}

export type RecordActivityInput = {
  subscriptionId: string;
  actorId: string | null;
  actorName: string | null;
  action: SubscriptionActivityAction;
  oldValue?: string | null;
  newValue?: string | null;
  note?: string | null;
};

export async function recordActivity(db: DbClient, input: RecordActivityInput): Promise<void> {
  const { error } = await db.from("subscription_activity").insert({
    subscription_id: input.subscriptionId,
    actor_id: input.actorId,
    actor_name: input.actorName,
    action: input.action,
    old_value: input.oldValue ?? null,
    new_value: input.newValue ?? null,
    note: input.note ?? null,
  });
  if (error) throw error;
}
