import { siteConfig } from "@/constants/site";
import { ROUTES } from "@/constants/routes";
import { escapeHtml, renderEmailLayout, renderPlainTextFooter } from "@/services/email/templates/layout";

export type PaymentApprovedEmailInput = {
  customerName: string;
  orderId: string;
  productNames: string;
};

export function paymentApprovedEmailTemplate(input: PaymentApprovedEmailInput) {
  const orderLabel = input.orderId.slice(0, 8);
  const products = input.productNames || "your subscription";

  const bodyHtml = `
    <p>Hi ${escapeHtml(input.customerName)},</p>
    <p>Good news — your payment for order ${orderLabel} has been verified, and <strong>${escapeHtml(products)}</strong> is now active.</p>
    <p>We'll follow up with your access details shortly.</p>
  `;

  const text = [
    `Hi ${input.customerName},`,
    "",
    `Good news — your payment for order ${orderLabel} has been verified, and ${products} is now active.`,
    "",
    "We'll follow up with your access details shortly.",
    renderPlainTextFooter(),
  ].join("\n");

  return {
    subject: `Payment approved — ${siteConfig.name}`,
    html: renderEmailLayout({
      previewText: `Your payment for order ${orderLabel} was approved.`,
      heading: "Payment approved",
      bodyHtml,
      ctaLabel: "View your subscriptions",
      ctaUrl: `${siteConfig.url}${ROUTES.dashboardSubscriptions}`,
    }),
    text,
  };
}
