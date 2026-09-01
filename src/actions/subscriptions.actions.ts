"use server";

import { revalidatePath } from "next/cache";

import { ROUTES } from "@/constants/routes";
import {
  cancelSubscriptionSchema,
  createSubscriptionSchema,
  extendSubscriptionSchema,
  reactivateSubscriptionSchema,
  setSubscriptionExpirySchema,
  updateSubscriptionDeliverySchema,
} from "@/features/subscriptions/schemas";
import { requireStaff } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { subscriptionDeliveryService, subscriptionsService } from "@/services";
import { actionError, actionSuccess, type ActionResult } from "@/types/api";
import type { Subscription } from "@/types/subscription";
import type { SubscriptionDelivery } from "@/types/subscription-delivery";

function revalidateSubscription(subscriptionId: string) {
  revalidatePath(ROUTES.adminSubscriptions);
  revalidatePath(ROUTES.adminSubscriptionDetail(subscriptionId));
}

/** Manual admin creation — comp access, migrated customers, or any grant not tied to a verified
 * checkout payment. `requireStaff()`, not `requireAdmin()`: this is day-to-day catalog/fulfillment
 * work a manager should be able to do, same as every other operational admin action. */
export async function createSubscriptionAction(input: unknown): Promise<ActionResult<Subscription>> {
  const staff = await requireStaff();

  const parsed = createSubscriptionSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid input", parsed.error.flatten().fieldErrors);

  const supabase = await createServerSupabaseClient();
  try {
    const subscription = await subscriptionsService.createSubscription(supabase, parsed.data, {
      id: staff.id,
      name: staff.fullName ?? staff.email,
    });
    revalidateSubscription(subscription.id);
    return actionSuccess(subscription);
  } catch (error) {
    return actionError(error instanceof Error ? error.message : "Could not create subscription");
  }
}

export async function extendSubscriptionAction(input: unknown): Promise<ActionResult<Subscription>> {
  const staff = await requireStaff();

  const parsed = extendSubscriptionSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid input", parsed.error.flatten().fieldErrors);

  const supabase = await createServerSupabaseClient();
  try {
    const subscription = await subscriptionsService.extendSubscription(supabase, parsed.data.subscriptionId, parsed.data.days, {
      id: staff.id,
      name: staff.fullName ?? staff.email,
    });
    revalidateSubscription(subscription.id);
    return actionSuccess(subscription);
  } catch (error) {
    return actionError(error instanceof Error ? error.message : "Could not extend subscription");
  }
}

export async function setSubscriptionExpiryAction(input: unknown): Promise<ActionResult<Subscription>> {
  const staff = await requireStaff();

  const parsed = setSubscriptionExpirySchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid input", parsed.error.flatten().fieldErrors);

  const expiryIso = new Date(parsed.data.expiryDate).toISOString();
  if (Number.isNaN(new Date(expiryIso).getTime())) return actionError("Invalid expiry date");

  const supabase = await createServerSupabaseClient();
  try {
    const subscription = await subscriptionsService.setSubscriptionExpiry(supabase, parsed.data.subscriptionId, expiryIso, {
      id: staff.id,
      name: staff.fullName ?? staff.email,
    });
    revalidateSubscription(subscription.id);
    return actionSuccess(subscription);
  } catch (error) {
    return actionError(error instanceof Error ? error.message : "Could not change expiry date");
  }
}

export async function cancelSubscriptionAction(input: unknown): Promise<ActionResult<Subscription>> {
  const staff = await requireStaff();

  const parsed = cancelSubscriptionSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid input", parsed.error.flatten().fieldErrors);

  const supabase = await createServerSupabaseClient();
  try {
    const subscription = await subscriptionsService.cancelSubscription(
      supabase,
      parsed.data.subscriptionId,
      { id: staff.id, name: staff.fullName ?? staff.email },
      parsed.data.note,
    );
    revalidateSubscription(subscription.id);
    return actionSuccess(subscription);
  } catch (error) {
    return actionError(error instanceof Error ? error.message : "Could not cancel subscription");
  }
}

export async function reactivateSubscriptionAction(input: unknown): Promise<ActionResult<Subscription>> {
  const staff = await requireStaff();

  const parsed = reactivateSubscriptionSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid input", parsed.error.flatten().fieldErrors);

  const supabase = await createServerSupabaseClient();
  try {
    const subscription = await subscriptionsService.reactivateSubscription(supabase, parsed.data.subscriptionId, {
      id: staff.id,
      name: staff.fullName ?? staff.email,
    });
    revalidateSubscription(subscription.id);
    return actionSuccess(subscription);
  } catch (error) {
    return actionError(error instanceof Error ? error.message : "Could not reactivate subscription");
  }
}

/** Creates or replaces a subscription's delivery credentials — also revalidates the customer's own
 * `/dashboard/subscriptions`, since this is the one subscription action a customer can actually see
 * the effect of. */
export async function updateSubscriptionDeliveryAction(input: unknown): Promise<ActionResult<SubscriptionDelivery>> {
  const staff = await requireStaff();

  const parsed = updateSubscriptionDeliverySchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid input", parsed.error.flatten().fieldErrors);

  const supabase = await createServerSupabaseClient();
  try {
    const delivery = await subscriptionDeliveryService.upsertDelivery(supabase, {
      subscriptionId: parsed.data.subscriptionId,
      accountEmail: parsed.data.accountEmail || null,
      accountUsername: parsed.data.accountUsername || null,
      accessInstructions: parsed.data.accessInstructions || null,
      profileInfo: parsed.data.profileInfo || null,
      actorId: staff.id,
      actorName: staff.fullName ?? staff.email,
    });
    revalidateSubscription(parsed.data.subscriptionId);
    revalidatePath(ROUTES.dashboardSubscriptions);
    return actionSuccess(delivery);
  } catch (error) {
    return actionError(error instanceof Error ? error.message : "Could not update delivery information");
  }
}
