"use server";

import { revalidatePath } from "next/cache";

import { ROUTES } from "@/constants/routes";
import { updateUserRoleSchema } from "@/features/admin/schemas";
import { requireAdmin } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { adminService } from "@/services";
import { actionError, actionSuccess, type ActionResult } from "@/types/api";

/** Role management — admin-only, deliberately not `requireStaff()`. A manager granted this would
 * be able to promote themselves (or anyone) to admin, which is exactly the privilege escalation
 * the staff/admin split exists to prevent. Also refuses to let anyone change their own role,
 * admins included — a cheap guard against locking yourself out by mistake. */
export async function updateUserRoleAction(input: unknown): Promise<ActionResult> {
  const currentUser = await requireAdmin();

  const parsed = updateUserRoleSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid input", parsed.error.flatten().fieldErrors);

  if (parsed.data.userId === currentUser.id) {
    return actionError("You can't change your own role.");
  }

  const supabase = await createServerSupabaseClient();
  try {
    await adminService.updateUserRole(supabase, parsed.data.userId, parsed.data.role);
    revalidatePath(ROUTES.adminCustomers);
    return actionSuccess(undefined);
  } catch (error) {
    return actionError(error instanceof Error ? error.message : "Could not update user role");
  }
}
