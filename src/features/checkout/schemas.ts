import { z } from "zod";

import { BD_PHONE_ERROR_MESSAGE, BD_PHONE_REGEX } from "@/lib/validation";

// Only the manually-verified methods this checkout flow actually supports — a subset of the
// DB's full `payments.method` check constraint (`PAYMENT_METHODS` in constants/subscription.ts
// also allows "card"/"sslcommerz", reserved for a future real gateway integration).
export const CHECKOUT_PAYMENT_METHODS = ["bkash", "nagad", "rocket"] as const;

export type CheckoutPaymentMethod = (typeof CHECKOUT_PAYMENT_METHODS)[number];

/**
 * Client-side (RHF `zodResolver`) schema — text fields only. The payment screenshot file is
 * validated separately (see `checkout-form.tsx`): mixing `File`/`FileList` into a schema shared
 * with server code is awkward (`FileList` doesn't exist outside the browser), and file validity
 * needs the same client + server-side double-check the rest of this schema gets from
 * `createCheckoutOrderSchema` below.
 */
export const checkoutFormSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().regex(BD_PHONE_REGEX, BD_PHONE_ERROR_MESSAGE),
  paymentMethod: z.enum(CHECKOUT_PAYMENT_METHODS, { message: "Select a payment method" }),
  transactionId: z.string().min(3, "Enter the transaction ID from your payment"),
});

export type CheckoutFormInput = z.infer<typeof checkoutFormSchema>;

const checkoutOrderItemSchema = z.object({
  productId: z.string().uuid(),
  // `order_items` has no `variant_id` column — this is only here so the server can look up the
  // *variant's* price instead of the base product's when the cart item was added under one, not
  // to persist it. See `checkoutService.placeOrder`.
  variantId: z.string().uuid().nullable(),
  quantity: z.coerce.number().int().positive(),
});

/**
 * Full server-side action input — the client schema above plus the cart snapshot. Deliberately
 * has no `price` field: `checkoutService.placeOrder` re-fetches each product's current price from
 * the database itself rather than trusting whatever the client sends, so a tampered price in the
 * request body can't change what gets charged. Same reasoning for `couponCode`: this is just the
 * *code*, never a discount amount — `placeOrder` independently re-validates and re-computes the
 * discount from scratch server-side (see `couponsService.validateCoupon`), so a client can't
 * submit its own discount figure even if it wanted to.
 */
export const createCheckoutOrderSchema = checkoutFormSchema.extend({
  items: z.array(checkoutOrderItemSchema).min(1, "Your cart is empty"),
  couponCode: z.string().optional(),
});

export type CreateCheckoutOrderInput = z.infer<typeof createCheckoutOrderSchema>;
