import { z } from "zod";

// `updateOrderStatusSchema` moved to `features/orders/schemas.ts` alongside the rest of order
// management — this file is user-role management only now.

export const updateUserRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["customer", "manager", "admin"]),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
