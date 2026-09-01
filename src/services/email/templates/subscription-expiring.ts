import { siteConfig } from "@/constants/site";
import { ROUTES } from "@/constants/routes";
import { escapeHtml, renderEmailLayout, renderPlainTextFooter } from "@/services/email/templates/layout";
import { formatDate } from "@/utils/format-date";

export type SubscriptionExpiringEmailInput = {
  customerName: string;
  productName: string;
  expiryDate: string;
};

export function subscriptionExpiringEmailTemplate(input: SubscriptionExpiringEmailInput) {
  const expiry = formatDate(input.expiryDate);

  const bodyHtml = `
    <p>Hi ${escapeHtml(input.customerName)},</p>
    <p>Your <strong>${escapeHtml(input.productName)}</strong> subscription expires on <strong>${expiry}</strong>. Renew soon to avoid any interruption.</p>
  `;

  const text = [
    `Hi ${input.customerName},`,
    "",
    `Your ${input.productName} subscription expires on ${expiry}. Renew soon to avoid any interruption.`,
    renderPlainTextFooter(),
  ].join("\n");

  return {
    subject: `Your ${input.productName} subscription is expiring soon — ${siteConfig.name}`,
    html: renderEmailLayout({
      previewText: `Your ${input.productName} subscription expires on ${expiry}.`,
      heading: "Subscription expiring soon",
      bodyHtml,
      ctaLabel: "Review your subscriptions",
      ctaUrl: `${siteConfig.url}${ROUTES.dashboardSubscriptions}`,
    }),
    text,
  };
}
