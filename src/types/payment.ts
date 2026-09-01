import type { PaymentMethod, PaymentRecordStatus } from "@/constants/subscription";

/**
 * Manual verification, not a payment gateway — the customer pays bKash/Nagad/Rocket "Send Money"
 * outside the app, then submits `transactionId` + a screenshot here for an admin to review. No
 * `amount`/`currency`/`gatewayReference` — see `payments` migration for why.
 */
export type Payment = {
  id: string;
  orderId: string;
  method: PaymentMethod;
  transactionId: string | null;
  /** Storage path within the private `payment-screenshots` bucket, not a public URL. */
  screenshot: string | null;
  status: PaymentRecordStatus;
  createdAt: string;
  updatedAt: string;
};

/** `Payment` + just enough order context for the admin verification list — not the full `Order`
 * (no `items`), since `paymentsService.listPendingPayments` doesn't need them. */
export type PaymentWithOrder = Payment & {
  order: {
    id: string;
    userId: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    totalAmount: number;
  };
};
