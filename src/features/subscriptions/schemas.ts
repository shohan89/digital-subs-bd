import { z } from "zod";

import { ADMIN_SUBSCRIPTION_SORTS } from "@/constants/subscriptions";
import { SUBSCRIPTION_STATUS } from "@/constants/subscription";

export const createSubscriptionSchema = z.object({
  customerEmail: z.string().email(),
  productId: z.string().uuid(),
  durationDays: z.number().int().min(1).max(3650),
  orderId: z.string().uuid().optional(),
});

export type CreateSubscriptionFormInput = z.infer<typeof createSubscriptionSchema>;

export const extendSubscriptionSchema = z.object({
  subscriptionId: z.string().uuid(),
  days: z.number().int().min(1).max(3650),
});

export type ExtendSubscriptionInput = z.infer<typeof extendSubscriptionSchema>;

export const setSubscriptionExpirySchema = z.object({
  subscriptionId: z.string().uuid(),
  // `<input type="date">`'s raw value ("YYYY-MM-DD") — converted to an ISO timestamp server-side.
  expiryDate: z.string().min(1, "Expiry date is required"),
});

export type SetSubscriptionExpiryInput = z.infer<typeof setSubscriptionExpirySchema>;

export const cancelSubscriptionSchema = z.object({
  subscriptionId: z.string().uuid(),
  note: z.string().max(500).optional(),
});

export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;

export const reactivateSubscriptionSchema = z.object({
  subscriptionId: z.string().uuid(),
});

export type ReactivateSubscriptionInput = z.infer<typeof reactivateSubscriptionSchema>;

export const updateSubscriptionDeliverySchema = z.object({
  subscriptionId: z.string().uuid(),
  accountEmail: z.string().max(255).optional(),
  accountUsername: z.string().max(255).optional(),
  accessInstructions: z.string().max(2000).optional(),
  profileInfo: z.string().max(500).optional(),
});

export type UpdateSubscriptionDeliveryFormInput = z.infer<typeof updateSubscriptionDeliverySchema>;

export const adminSubscriptionFiltersSchema = z.object({
  search: z.string().optional(),
  filterStatus: z.enum(SUBSCRIPTION_STATUS).optional(),
  sort: z.enum(ADMIN_SUBSCRIPTION_SORTS).optional(),
});

export type AdminSubscriptionFiltersInput = z.infer<typeof adminSubscriptionFiltersSchema>;
