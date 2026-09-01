import { z } from "zod";

import { ADMIN_CUSTOMER_STATUS_FILTERS } from "@/constants/customers";

export const setCustomerDisabledSchema = z.object({
  customerId: z.string().uuid(),
  disabled: z.boolean(),
});

export type SetCustomerDisabledInput = z.infer<typeof setCustomerDisabledSchema>;

export const adminCustomerFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(ADMIN_CUSTOMER_STATUS_FILTERS).optional(),
});

export type AdminCustomerFiltersInput = z.infer<typeof adminCustomerFiltersSchema>;
