import { siteConfig } from "@/constants/site";
import { ROUTES } from "@/constants/routes";
import { escapeHtml, renderEmailLayout, renderPlainTextFooter } from "@/services/email/templates/layout";

export type SubscriptionDeliveredEmailInput = {
  customerName: string;
  productName: string;
};

/**
 * Deliberately never includes the actual account credentials (email/username/access
 * instructions) — same reasoning `subscription_deliveries`' RLS already encodes (sensitive
 * account data, access-controlled, not something to also fan out over email/inbox search). This
 * email is just the "it's ready" ping; the customer reads the real details on
 * `/dashboard/subscriptions`.
 */
export function subscriptionDeliveredEmailTemplate(input: SubscriptionDeliveredEmailInput) {
  const bodyHtml = `
    <p>Hi ${escapeHtml(input.customerName)},</p>
    <p>Your <strong>${escapeHtml(input.productName)}</strong> access is ready. Log in to your dashboard to view your account details and start using it.</p>
  `;

  const text = [
    `Hi ${input.customerName},`,
    "",
    `Your ${input.productName} access is ready. Log in to your dashboard to view your account details and start using it.`,
    renderPlainTextFooter(),
  ].join("\n");

  return {
    subject: `Your ${input.productName} access is ready — ${siteConfig.name}`,
    html: renderEmailLayout({
      previewText: `Your ${input.productName} access details are ready.`,
      heading: "Subscription delivered",
      bodyHtml,
      ctaLabel: "View access details",
      ctaUrl: `${siteConfig.url}${ROUTES.dashboardSubscriptions}`,
    }),
    text,
  };
}
