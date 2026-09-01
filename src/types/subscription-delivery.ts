/**
 * Sensitive account-delivery credentials for a subscription (shared-account email/username,
 * access instructions, profile/PIN info) — readable by the owning customer and staff only, never
 * a public page. See `subscription_deliveries`' RLS policies and
 * `src/services/subscription-delivery.service.ts`'s doc comment for why this is a separate table
 * from `subscriptions` rather than columns on it.
 */
export type SubscriptionDelivery = {
  subscriptionId: string;
  accountEmail: string | null;
  accountUsername: string | null;
  accessInstructions: string | null;
  profileInfo: string | null;
  updatedAt: string;
  updatedBy: string | null;
};
