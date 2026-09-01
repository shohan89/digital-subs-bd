import * as emailService from "@/services/email/email.service";
import * as notificationsService from "@/services/notifications.service";
import * as subscriptionActivityService from "@/services/subscription-activity.service";
import type { DbClient } from "@/services/types";
import type { SubscriptionDelivery } from "@/types/subscription-delivery";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw row shape, DbClient is untyped until database.types.ts is generated (see comment there)
function mapDelivery(row: any): SubscriptionDelivery {
  return {
    subscriptionId: row.subscription_id,
    accountEmail: row.account_email,
    accountUsername: row.account_username,
    accessInstructions: row.access_instructions,
    profileInfo: row.profile_info,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

/** Staff or the owning customer only — enforced by `subscription_deliveries`' RLS ("staff full
 * access" + "view own"), not an application-layer check here. Never call this from a code path
 * that could render to any other customer or an unauthenticated visitor. */
export async function getDeliveryForSubscription(db: DbClient, subscriptionId: string): Promise<SubscriptionDelivery | null> {
  const { data, error } = await db
    .from("subscription_deliveries")
    .select("*")
    .eq("subscription_id", subscriptionId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapDelivery(data) : null;
}

/** Bulk lookup for a page rendering several subscriptions at once (e.g. the customer's own
 * "/dashboard/subscriptions") — one query, keyed by `subscriptionId`, instead of N sequential
 * `getDeliveryForSubscription` calls. A subscription with no delivery info yet simply has no key
 * in the returned map. */
export async function listDeliveriesForSubscriptions(
  db: DbClient,
  subscriptionIds: string[],
): Promise<Record<string, SubscriptionDelivery>> {
  if (subscriptionIds.length === 0) return {};
  const { data, error } = await db.from("subscription_deliveries").select("*").in("subscription_id", subscriptionIds);
  if (error) throw error;
  const result: Record<string, SubscriptionDelivery> = {};
  for (const row of data ?? []) {
    const delivery = mapDelivery(row);
    result[delivery.subscriptionId] = delivery;
  }
  return result;
}

export type UpsertDeliveryInput = {
  subscriptionId: string;
  accountEmail?: string | null;
  accountUsername?: string | null;
  accessInstructions?: string | null;
  profileInfo?: string | null;
  actorId: string;
  actorName: string;
};

/** Creates or replaces a subscription's delivery info in one write (`upsert` on the table's
 * `subscription_id` primary key), then logs a `delivery_updated` activity entry — the entry never
 * carries the credential values themselves (`subscription_activity` has no customer-readable RLS,
 * but there's no reason to duplicate sensitive values into a second table regardless).
 *
 * Notifies the customer with "Subscription delivered" only the *first* time a subscription gets
 * delivery info (checked via a pre-upsert existence lookup, since `upsert` itself can't tell
 * insert from update apart) — every later edit is staff correcting/updating existing credentials,
 * not a new delivery event the customer needs notifying about again.
 */
export async function upsertDelivery(db: DbClient, input: UpsertDeliveryInput): Promise<SubscriptionDelivery> {
  const { data: existing, error: existingError } = await db
    .from("subscription_deliveries")
    .select("subscription_id")
    .eq("subscription_id", input.subscriptionId)
    .maybeSingle();
  if (existingError) throw existingError;
  const isFirstDelivery = !existing;

  const { data, error } = await db
    .from("subscription_deliveries")
    .upsert({
      subscription_id: input.subscriptionId,
      account_email: input.accountEmail ?? null,
      account_username: input.accountUsername ?? null,
      access_instructions: input.accessInstructions ?? null,
      profile_info: input.profileInfo ?? null,
      updated_by: input.actorId,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;

  await subscriptionActivityService.recordActivity(db, {
    subscriptionId: input.subscriptionId,
    actorId: input.actorId,
    actorName: input.actorName,
    action: "delivery_updated",
  });

  if (isFirstDelivery) {
    try {
      const { data } = await db
        .from("subscriptions")
        .select("user_id, customer_name, customer_email, product:products(name)")
        .eq("id", input.subscriptionId)
        .maybeSingle();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw row shape, DbClient is untyped until database.types.ts is generated (see comment there)
      const subscription = data as any;
      if (subscription) {
        const productName = subscription.product?.name ?? "Your subscription";
        await notificationsService.createNotificationIfNotExists(db, {
          userId: subscription.user_id,
          type: "subscription_delivered",
          title: "Subscription delivered",
          message: `${productName} access details are ready — check your subscription for login info.`,
          relatedId: input.subscriptionId,
        });
        if (subscription.customer_email) {
          await emailService.sendSubscriptionDeliveredEmail(
            { email: subscription.customer_email, name: subscription.customer_name ?? undefined },
            { customerName: subscription.customer_name ?? "there", productName },
          );
        }
      }
    } catch (notifyError) {
      console.error("Failed to send subscription-delivered notification", notifyError);
    }
  }

  return mapDelivery(data);
}
