import { z } from "zod";

import { ADMIN_ORDER_FILTER_STATUSES } from "@/constants/orders";
import { ORDER_STATUS } from "@/constants/subscription";

export const updateOrderStatusSchema = z.object({
  orderId: z.string().uuid(),
  // Fulfillment status only (`orders.status`) — not `payment_status`, a separate column/enum
  // moved by `approvePaymentAction`/`rejectPaymentAction` instead. `note` backs the optional
  // cancellation reason on "Cancel order" — unused by "Mark processing"/"Mark completed", which
  // have nothing meaningful to annotate.
  status: z.enum(ORDER_STATUS),
  note: z.string().max(500).optional(),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const adminOrderFiltersSchema = z.object({
  search: z.string().optional(),
  filterStatus: z.enum(ADMIN_ORDER_FILTER_STATUSES).optional(),
});

export type AdminOrderFiltersInput = z.infer<typeof adminOrderFiltersSchema>;
