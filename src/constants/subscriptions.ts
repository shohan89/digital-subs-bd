import type { SubscriptionActivityAction } from "@/types/subscription-activity";

// Admin subscription list sort options. No separate "admin filter status" type is needed here the
// way `constants/orders.ts`'s `AdminOrderFilterStatus` is — the 4 requested filter tabs
// (Active/Expiring Soon/Expired/Cancelled) are exactly `SUBSCRIPTION_STATUS`
// (`constants/subscription.ts`), reused directly by `AdminSubscriptionToolbar`.
export const ADMIN_SUBSCRIPTION_SORTS = ["expiry_asc", "expiry_desc", "newest", "customer_asc"] as const;

export type AdminSubscriptionSort = (typeof ADMIN_SUBSCRIPTION_SORTS)[number];

export const ADMIN_SUBSCRIPTION_SORT_LABEL: Record<AdminSubscriptionSort, string> = {
  expiry_asc: "Expiry (soonest)",
  expiry_desc: "Expiry (latest)",
  newest: "Newest",
  customer_asc: "Customer (A–Z)",
};

export const SUBSCRIPTION_ACTIVITY_ACTION_LABEL: Record<SubscriptionActivityAction, string> = {
  subscription_created: "Subscription created",
  subscription_extended: "Subscription extended",
  expiry_changed: "Expiry date changed",
  subscription_cancelled: "Subscription cancelled",
  subscription_reactivated: "Subscription reactivated",
  delivery_updated: "Delivery info updated",
};
