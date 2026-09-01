"use server";

import { revalidatePath } from "next/cache";

import { ROUTES } from "@/constants/routes";
import { updateProfileSchema } from "@/features/profile/schemas";
import { requireUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { authService } from "@/services";
import { actionError, actionSuccess, type ActionResult } from "@/types/api";

/**
 * `profiles` RLS has "view own" (select) and admin-full-access — no customer UPDATE policy at
 * all (a real gap, found via testing: the session-scoped client fails silently here). Runs on the
 * service-role client instead, same justification as `checkoutService.placeOrder` and
 * `paymentVerificationService`: `userId` comes only from `requireUser()` above, and the write is
 * scoped to that exact id (`authService.updateProfile`'s `.eq("id", userId)`), so this can't touch
 * any row but the caller's own.
 */
export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid input", parsed.error.flatten().fieldErrors);

  const supabase = createAdminClient();
  try {
    await authService.updateProfile(supabase, user.id, { fullName: parsed.data.fullName, phone: parsed.data.phone ?? "" });
    revalidatePath(ROUTES.dashboardProfile);
    return actionSuccess(undefined);
  } catch (error) {
    return actionError(error instanceof Error ? error.message : "Could not update your profile");
  }
}
