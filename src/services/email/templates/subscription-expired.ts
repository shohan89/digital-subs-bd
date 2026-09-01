import { siteConfig } from "@/constants/site";
import { ROUTES } from "@/constants/routes";
import { escapeHtml, renderEmailLayout, renderPlainTextFooter } from "@/services/email/templates/layout";

export type SubscriptionExpiredEmailInput = {
  customerName: string;
  productName: string;
};

export function subscriptionExpiredEmailTemplate(input: SubscriptionExpiredEmailInput) {
  const bodyHtml = `
    <p>Hi ${escapeHtml(input.customerName)},</p>
    <p>Your <strong>${escapeHtml(input.productName)}</strong> subscription has expired. Renew it to restore access.</p>
  `;

  const text = [
    `Hi ${input.customerName},`,
    "",
    `Your ${input.productName} subscription has expired. Renew it to restore access.`,
    renderPlainTextFooter(),
  ].join("\n");

  return {
    subject: `Your ${input.productName} subscription has expired — ${siteConfig.name}`,
    html: renderEmailLayout({
      previewText: `Your ${input.productName} subscription has expired.`,
      heading: "Subscription expired",
      bodyHtml,
      ctaLabel: "Renew now",
      ctaUrl: `${siteConfig.url}${ROUTES.dashboardSubscriptions}`,
    }),
    text,
  };
}
