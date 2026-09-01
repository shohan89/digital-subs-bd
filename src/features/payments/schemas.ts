import { z } from "zod";

export const approvePaymentSchema = z.object({
  paymentId: z.string().uuid(),
});

export type ApprovePaymentInput = z.infer<typeof approvePaymentSchema>;

export const rejectPaymentSchema = z.object({
  paymentId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

export type RejectPaymentInput = z.infer<typeof rejectPaymentSchema>;
