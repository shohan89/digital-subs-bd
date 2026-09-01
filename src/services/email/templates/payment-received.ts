import { siteConfig } from "@/constants/site";
import { ROUTES } from "@/constants/routes";
import { PAYMENT_METHOD_LABEL, type PaymentMethod } from "@/constants/subscription";
import { escapeHtml, renderEmailLayout, renderPlainTextFooter } from "@/services/email/templates/layout";

export type PaymentReceivedEmailInput = {
  customerName: string;
  orderId: string;
  method: PaymentMethod;
  transactionId: string | null;
};

/** "We got your payment proof, an admin will verify it" — distinct from "Payment approved" below,
 * which is the actual verification decision. */
export function paymentReceivedEmailTemplate(input: PaymentReceivedEmailInput) {
  const orderLabel = input.orderId.slice(0, 8);
  const methodLabel = PAYMENT_METHOD_LABEL[input.method];

  const bodyHtml = `
    <p>Hi ${escapeHtml(input.customerName)},</p>
    <p>We've received your payment submission for order ${orderLabel} via ${escapeHtml(methodLabel)}${
      input.transactionId ? ` (transaction ID ${escapeHtml(input.transactionId)})` : ""
    }.</p>
    <p>Our team will verify it shortly — you'll get another email as soon as it's confirmed.</p>
  `;

  const text = [
    `Hi ${input.customerName},`,
    "",
    `We've received your payment submission for order ${orderLabel} via ${methodLabel}${
      input.transactionId ? ` (transaction ID ${input.transactionId})` : ""
    }.`,
    "",
    "Our team will verify it shortly — you'll get another email as soon as it's confirmed.",
    renderPlainTextFooter(),
  ].join("\n");

  return {
    subject: `Payment received — ${siteConfig.name}`,
    html: renderEmailLayout({
      previewText: `We've received your payment for order ${orderLabel}.`,
      heading: "Payment received",
      bodyHtml,
      ctaLabel: "View your orders",
      ctaUrl: `${siteConfig.url}${ROUTES.dashboardOrders}`,
    }),
    text,
  };
}
