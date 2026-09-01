"use server";

import { revalidatePath } from "next/cache";

import { ROUTES } from "@/constants/routes";
import { setCustomerDisabledSchema } from "@/features/customers/schemas";
import { requireAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { customersService } from "@/services";
import { actionError, actionSuccess, type ActionResult } from "@/types/api";
import type { Customer } from "@/types/customer";

/**
 * Disables or re-enables an account — `requireAdmin()`, not `requireStaff()` (matches every other
 * action reachable from `/admin/customers`, itself admin-only for role-management reasons, see
 * `requireAdmin`'s doc comment). Runs on the service-role client (`createAdminClient()`), not the
 * admin's own session — `customersService.setCustomerDisabled` needs `auth.admin.updateUserById`,
 * which has no session-scoped equivalent.
 *
 * "Disable account where appropriate": blocks disabling your own account (same self-action guard
 * as `updateUserRoleAction`) and blocks disabling any `admin`-role account outright, so one admin
 * can't lock out another. Both checks only apply when *disabling* — re-enabling any account is
 * always allowed.
 */
export async function setCustomerDisabledAction(input: unknown): Promise<ActionResult<Customer>> {
  const currentUser = await requireAdmin();

  const parsed = setCustomerDisabledSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid input", parsed.error.flatten().fieldErrors);

  const admin = createAdminClient();

  if (parsed.data.disabled) {
    if (parsed.data.customerId === currentUser.id) {
      return actionError("You can't disable your own account.");
    }
    const target = await customersService.getCustomerById(admin, parsed.data.customerId);
    if (!target) return actionError("Customer not found");
    if (target.role === "admin") return actionError("Admin accounts can't be disabled.");
  }

  try {
    const customer = await customersService.setCustomerDisabled(admin, parsed.data.customerId, parsed.data.disabled);
    revalidatePath(ROUTES.adminCustomers);
    revalidatePath(ROUTES.adminCustomerDetail(customer.id));
    return actionSuccess(customer);
  } catch (error) {
    return actionError(error instanceof Error ? error.message : "Could not update this account");
  }
}
