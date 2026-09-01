import { siteConfig } from "@/constants/site";
import { ROUTES } from "@/constants/routes";
import { escapeHtml, renderEmailLayout, renderPlainTextFooter } from "@/services/email/templates/layout";

export type PaymentRejectedEmailInput = {
  customerName: string;
  orderId: string;
  reason?: string | null;
};

export function paymentRejectedEmailTemplate(input: PaymentRejectedEmailInput) {
  const orderLabel = input.orderId.slice(0, 8);
  const reasonText = input.reason?.trim() ? input.reason.trim() : null;

  const bodyHtml = `
    <p>Hi ${escapeHtml(input.customerName)},</p>
    <p>We couldn't verify your payment for order ${orderLabel}${reasonText ? `: <strong>${escapeHtml(reasonText)}</strong>` : "."}</p>
    <p>Please double-check your payment and submit a new proof, or contact support if you think this is a mistake.</p>
  `;

  const text = [
    `Hi ${input.customerName},`,
    "",
    `We couldn't verify your payment for order ${orderLabel}${reasonText ? `: ${reasonText}` : "."}`,
    "",
    "Please double-check your payment and submit a new proof, or contact support if you think this is a mistake.",
    renderPlainTextFooter(),
  ].join("\n");

  return {
    subject: `Payment could not be verified — ${siteConfig.name}`,
    html: renderEmailLayout({
      previewText: `Your payment for order ${orderLabel} could not be verified.`,
      heading: "Payment rejected",
      bodyHtml,
      ctaLabel: "View your orders",
      ctaUrl: `${siteConfig.url}${ROUTES.dashboardOrders}`,
    }),
    text,
  };
}
