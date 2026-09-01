import { z } from "zod";

import { BD_PHONE_ERROR_MESSAGE, BD_PHONE_REGEX } from "@/lib/validation";

/** Order ID + phone is the whole authorization check for this public, unauthenticated lookup — no
 * session involved (see `order-tracking.actions.ts`). The order id being a full UUID (128 bits of
 * entropy) is what actually makes this safe to expose without a login: it's only guessable by
 * someone who already has it (the customer, from the confirmation page/email), and the phone
 * number is a second factor on top of that, not the primary boundary. */
export const orderTrackingSchema = z.object({
  orderId: z.string().uuid("Enter a valid order ID"),
  phone: z.string().regex(BD_PHONE_REGEX, BD_PHONE_ERROR_MESSAGE),
});

export type OrderTrackingInput = z.infer<typeof orderTrackingSchema>;
