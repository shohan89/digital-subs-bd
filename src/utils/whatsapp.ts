/** Builds a `wa.me` deep link from a raw phone number (digits only, e.g. "8801700000000") and an
 * optional prefilled message — the shared helper every "Contact Support"/"Buy Now" CTA uses, so
 * the URL-encoding/format only needs to be right in one place. */
export function buildWhatsAppUrl(number: string, message?: string): string {
  const digits = number.replace(/\D/g, "");
  return message ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : `https://wa.me/${digits}`;
}

/**
 * The one place that decides what an order-specific support message says — deliberately just a
 * store name and the same short order label (`order.id.slice(0, 8)`) used everywhere else in this
 * app (order confirmation pages, notifications, emails), nothing else. Never extend this to
 * interpolate a password, delivery credential, payment method/transaction ID, or any other
 * sensitive field — a `wa.me` link's `text` parameter is plainly visible in the URL itself (shared
 * links, browser history, referrer headers), not a secure channel, so only non-sensitive,
 * already-public-facing identifiers belong here.
 */
export function buildOrderSupportMessage(orderId: string, storeName: string): string {
  return `Hello ${storeName}, I need help with Order #${orderId.slice(0, 8)}.`;
}
