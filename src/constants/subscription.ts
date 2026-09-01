export const SUBSCRIPTION_STATUS = ["active", "expiring_soon", "expired", "cancelled"] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[number];

/** Days before expiry at which a subscription is flagged "expiring soon". */
export const EXPIRY_WARNING_THRESHOLD_DAYS = 3;

export const SUBSCRIPTION_STATUS_LABEL: Record<SubscriptionStatus, string> = {
  active: "Active",
  expiring_soon: "Expiring soon",
  expired: "Expired",
  cancelled: "Cancelled",
};

// Fulfillment status only — separate from payment status (`PAYMENT_STATUS` below), matching
// `orders.status`/`orders.payment_status` being two independent columns/enums in the DB, not one
// combined status.
export const ORDER_STATUS = ["pending", "processing", "completed", "cancelled"] as const;

export type OrderStatus = (typeof ORDER_STATUS)[number];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  cancelled: "Cancelled",
};

// `orders.payment_status` — whether the order has been paid for, independent of fulfillment.
export const PAYMENT_STATUS = ["pending", "paid", "failed", "refunded"] as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[number];

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
};

export const PAYMENT_METHODS = ["bkash", "nagad", "rocket", "card", "sslcommerz"] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  bkash: "bKash",
  nagad: "Nagad",
  rocket: "Rocket",
  card: "Card",
  sslcommerz: "SSLCommerz",
};

// `payments.status` — the manual-verification state of one payment record (see
// `payments.screenshot`/`payments.transaction_id`: an admin reviews and moves this to
// verified/rejected, distinct from `orders.payment_status` above which reflects the order overall.
export const PAYMENT_RECORD_STATUS = ["pending", "verified", "rejected", "refunded"] as const;

export type PaymentRecordStatus = (typeof PAYMENT_RECORD_STATUS)[number];

export const PAYMENT_RECORD_STATUS_LABEL: Record<PaymentRecordStatus, string> = {
  pending: "Pending verification",
  verified: "Verified",
  rejected: "Rejected",
  refunded: "Refunded",
};
