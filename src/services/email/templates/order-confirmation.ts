import { siteConfig } from "@/constants/site";
import { ROUTES } from "@/constants/routes";
import { escapeHtml, renderEmailLayout, renderPlainTextFooter } from "@/services/email/templates/layout";
import { formatCurrency } from "@/utils/format-currency";

export type OrderConfirmationEmailInput = {
  customerName: string;
  orderId: string;
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
};

export function orderConfirmationEmailTemplate(input: OrderConfirmationEmailInput) {
  const orderLabel = input.orderId.slice(0, 8);
  const rows = input.items
    .map(
      (item) =>
        `<tr>
           <td style="padding:6px 0;border-bottom:1px solid #f3f4f6;">${escapeHtml(item.name)} × ${item.quantity}</td>
           <td style="padding:6px 0;border-bottom:1px solid #f3f4f6;text-align:right;">${formatCurrency(item.price * item.quantity)}</td>
         </tr>`,
    )
    .join("");

  const bodyHtml = `
    <p>Hi ${escapeHtml(input.customerName)},</p>
    <p>Thanks for your order — we've received it and it's now waiting on payment verification.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;font-size:14px;">
      ${rows}
      <tr><td style="padding:6px 0;">Subtotal</td><td style="padding:6px 0;text-align:right;">${formatCurrency(input.subtotal)}</td></tr>
      ${
        input.discountAmount > 0
          ? `<tr><td style="padding:6px 0;">Discount</td><td style="padding:6px 0;text-align:right;">-${formatCurrency(input.discountAmount)}</td></tr>`
          : ""
      }
      <tr><td style="padding:6px 0;font-weight:600;">Total</td><td style="padding:6px 0;text-align:right;font-weight:600;">${formatCurrency(input.totalAmount)}</td></tr>
    </table>
    <p style="color:#6b7280;font-size:13px;">Order reference: ${orderLabel}</p>
  `;

  const text = [
    `Hi ${input.customerName},`,
    "",
    "Thanks for your order — we've received it and it's now waiting on payment verification.",
    "",
    ...input.items.map((item) => `- ${item.name} × ${item.quantity}: ${formatCurrency(item.price * item.quantity)}`),
    "",
    `Subtotal: ${formatCurrency(input.subtotal)}`,
    ...(input.discountAmount > 0 ? [`Discount: -${formatCurrency(input.discountAmount)}`] : []),
    `Total: ${formatCurrency(input.totalAmount)}`,
    "",
    `Order reference: ${orderLabel}`,
    renderPlainTextFooter(),
  ].join("\n");

  return {
    subject: `Order received — ${siteConfig.name}`,
    html: renderEmailLayout({
      previewText: `We've received your order (${orderLabel}).`,
      heading: "Order received",
      bodyHtml,
      ctaLabel: "View your orders",
      ctaUrl: `${siteConfig.url}${ROUTES.dashboardOrders}`,
    }),
    text,
  };
}
