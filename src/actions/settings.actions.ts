"use server";

import { revalidatePath } from "next/cache";

import { ROUTES } from "@/constants/routes";
import {
  deliverySettingsSchema,
  generalSettingsSchema,
  paymentSettingsSchema,
  seoSettingsSchema,
  socialSettingsSchema,
} from "@/features/settings/schemas";
import { requireAdmin } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { settingsService } from "@/services";
import { actionError, actionSuccess, type ActionResult } from "@/types/api";

/**
 * Site-wide configuration — `requireAdmin()`, not `requireStaff()`, for every action in this file,
 * matching the page's own gating and CLAUDE.md's "Settings" rule (same category as coupons: direct
 * revenue/brand impact, admin-only). Runs on the caller's own session-scoped client: `settings`'
 * "admin full access" RLS policy already grants a real admin's session everything these writes
 * need, no service-role client required. Every path in this file revalidates every public route
 * that reads settings (home, product pages, checkout, the root layout) since a single section edit
 * (e.g. the store name) can affect several of them at once.
 */
function revalidatePublicPages() {
  revalidatePath("/", "layout");
}

export async function updateGeneralSettingsAction(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = generalSettingsSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid input", parsed.error.flatten().fieldErrors);

  const supabase = await createServerSupabaseClient();
  try {
    await settingsService.updateSettingsSection(supabase, "general", { ...parsed.data, supportPhone: parsed.data.supportPhone ?? "" });
    revalidatePath(ROUTES.adminSettings);
    revalidatePublicPages();
    return actionSuccess(undefined);
  } catch (error) {
    return actionError(error instanceof Error ? error.message : "Could not save general settings");
  }
}

export async function updatePaymentSettingsAction(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = paymentSettingsSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid input", parsed.error.flatten().fieldErrors);

  const supabase = await createServerSupabaseClient();
  try {
    await settingsService.updateSettingsSection(supabase, "payment", parsed.data);
    revalidatePath(ROUTES.adminSettings);
    revalidatePublicPages();
    return actionSuccess(undefined);
  } catch (error) {
    return actionError(error instanceof Error ? error.message : "Could not save payment settings");
  }
}

export async function updateDeliverySettingsAction(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = deliverySettingsSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid input", parsed.error.flatten().fieldErrors);

  const supabase = await createServerSupabaseClient();
  try {
    await settingsService.updateSettingsSection(supabase, "delivery", parsed.data);
    revalidatePath(ROUTES.adminSettings);
    revalidatePublicPages();
    return actionSuccess(undefined);
  } catch (error) {
    return actionError(error instanceof Error ? error.message : "Could not save delivery settings");
  }
}

export async function updateSeoSettingsAction(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = seoSettingsSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid input", parsed.error.flatten().fieldErrors);

  const supabase = await createServerSupabaseClient();
  try {
    await settingsService.updateSettingsSection(supabase, "seo", parsed.data);
    revalidatePath(ROUTES.adminSettings);
    revalidatePublicPages();
    return actionSuccess(undefined);
  } catch (error) {
    return actionError(error instanceof Error ? error.message : "Could not save SEO settings");
  }
}

export async function updateSocialSettingsAction(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = socialSettingsSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid input", parsed.error.flatten().fieldErrors);

  const supabase = await createServerSupabaseClient();
  try {
    await settingsService.updateSettingsSection(supabase, "social", parsed.data);
    revalidatePath(ROUTES.adminSettings);
    revalidatePublicPages();
    return actionSuccess(undefined);
  } catch (error) {
    return actionError(error instanceof Error ? error.message : "Could not save social settings");
  }
}
