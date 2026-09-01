import type { UserRole } from "@/types/user";

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  customer: "Customer",
  manager: "Manager",
  admin: "Admin",
};

// "Filter" for the admin customer list — account status, not role. Ties directly to the one
// account-state concept this feature introduces (`profiles.disabled`); a role filter would imply
// role-management UI this page deliberately doesn't add (see the doc comment on
// `updateUserRoleAction` in `src/actions/admin.actions.ts` — role changes stay a separate,
// already-existing action this feature reuses display-only, via the `USER_ROLE_LABEL` badge above).
export const ADMIN_CUSTOMER_STATUS_FILTERS = ["active", "disabled"] as const;

export type AdminCustomerStatusFilter = (typeof ADMIN_CUSTOMER_STATUS_FILTERS)[number];

export const ADMIN_CUSTOMER_STATUS_FILTER_LABEL: Record<AdminCustomerStatusFilter, string> = {
  active: "Active",
  disabled: "Disabled",
};
