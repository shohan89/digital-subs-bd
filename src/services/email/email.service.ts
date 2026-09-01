import "server-only";

import { getEmailProvider } from "@/services/email/provider";
import {
  orderConfirmationEmailTemplate,
  paymentApprovedEmailTemplate,
  paymentReceivedEmailTemplate,
  paymentRejectedEmailTemplate,
  subscriptionDeliveredEmailTemplate,
  subscriptionExpiredEmailTemplate,
  subscriptionExpiringEmailTemplate,
  type OrderConfirmationEmailInput,
  type PaymentApprovedEmailInput,
  type PaymentReceivedEmailInput,
  type PaymentRejectedEmailInput,
  type SubscriptionDeliveredEmailInput,
  type SubscriptionExpiredEmailInput,
  type SubscriptionExpiringEmailInput,
} from "@/services/email/templates";
import type { EmailAddress, EmailSendResult } from "@/services/email/types";

/**
 * The only file outside `services/email/` should ever need to import from — every exported
 * function here builds one template (`templates/*`) and hands it to whichever `EmailProvider`
 * `provider.ts` resolves to. No caller ever touches a template or a provider directly, and no
 * caller ever needs to know whether email is actually being sent or just logged to the console
 * (`EMAIL_PROVIDER=console`, the default — see `provider.ts`).
 *
 * Every function here is intentionally non-throwing: it catches internally, logs, and returns
 * `EmailSendResult` rather than rejecting. Every call site that sends an email (checkout, payment
 * verification, subscription delivery, subscription-lifecycle sync) treats it exactly like the
 * in-app notification it sends alongside — a failure to email a customer must never fail the
 * underlying order/payment/subscription action that already succeeded. Callers can still inspect
 * the returned result if they want to (e.g. to log a warning), but are never required to wrap the
 * call in their own try/catch.
 */
async function sendEmail(to: EmailAddress, template: { subject: string; html: string; text: string }): Promise<EmailSendResult> {
  try {
    const provider = getEmailProvider();
    return await provider.send({ to, subject: template.subject, html: template.html, text: template.text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error sending email";
    console.error(`Failed to send email "${template.subject}" to ${to.email}`, error);
    return { success: false, error: message };
  }
}

export async function sendOrderConfirmationEmail(to: EmailAddress, input: OrderConfirmationEmailInput): Promise<EmailSendResult> {
  return sendEmail(to, orderConfirmationEmailTemplate(input));
}

export async function sendPaymentReceivedEmail(to: EmailAddress, input: PaymentReceivedEmailInput): Promise<EmailSendResult> {
  return sendEmail(to, paymentReceivedEmailTemplate(input));
}

export async function sendPaymentApprovedEmail(to: EmailAddress, input: PaymentApprovedEmailInput): Promise<EmailSendResult> {
  return sendEmail(to, paymentApprovedEmailTemplate(input));
}

export async function sendPaymentRejectedEmail(to: EmailAddress, input: PaymentRejectedEmailInput): Promise<EmailSendResult> {
  return sendEmail(to, paymentRejectedEmailTemplate(input));
}

export async function sendSubscriptionDeliveredEmail(to: EmailAddress, input: SubscriptionDeliveredEmailInput): Promise<EmailSendResult> {
  return sendEmail(to, subscriptionDeliveredEmailTemplate(input));
}

export async function sendSubscriptionExpiringEmail(to: EmailAddress, input: SubscriptionExpiringEmailInput): Promise<EmailSendResult> {
  return sendEmail(to, subscriptionExpiringEmailTemplate(input));
}

export async function sendSubscriptionExpiredEmail(to: EmailAddress, input: SubscriptionExpiredEmailInput): Promise<EmailSendResult> {
  return sendEmail(to, subscriptionExpiredEmailTemplate(input));
}
