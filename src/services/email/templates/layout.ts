import { siteConfig } from "@/constants/site";

/**
 * Escapes any dynamic value interpolated into an email's HTML — customer/product names ultimately
 * come from user-editable data (a product name, a customer's own profile name), so this is the
 * same defensive reasoning as escaping user content on a web page, just applied to an HTML email
 * instead. Every template below runs its dynamic fields through this before building `bodyHtml`.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type EmailLayoutInput = {
  /** Shown by the inbox list view (Gmail/Outlook preview snippet) before the email is opened —
   * plain text, not HTML. */
  previewText: string;
  heading: string;
  /** Pre-built HTML fragment for the email body — the caller is responsible for escaping any
   * dynamic value it interpolates (see `escapeHtml` above). */
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
};

/**
 * Table-based layout with every style inlined — the only markup email clients reliably render
 * consistently (`<style>` blocks and CSS grid/flexbox are inconsistently supported across
 * Gmail/Outlook/Apple Mail). Brand colors match `PROJECT_STRUCTURE.md`'s Design system table
 * exactly (`#00A8FF` primary / `#020617` background / `#FFB800` accent) — the CTA button uses a
 * **dark** foreground on the primary-colored background, matching this app's own contrast rule for
 * `primary`/`accent` (both fail WCAG AA with white text).
 */
export function renderEmailLayout({ previewText, heading, bodyHtml, ctaLabel, ctaUrl }: EmailLayoutInput): string {
  const cta =
    ctaLabel && ctaUrl
      ? `<tr><td style="padding:8px 32px 8px;">
           <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background-color:#00A8FF;color:#020617;font-weight:600;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:8px;">${escapeHtml(ctaLabel)}</a>
         </td></tr>`
      : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(heading)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <span style="display:none;visibility:hidden;opacity:0;overflow:hidden;height:0;width:0;">${escapeHtml(previewText)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:480px;max-width:90vw;background-color:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background-color:#020617;padding:20px 32px;">
                <span style="color:#FFB800;font-weight:700;font-size:18px;font-family:Georgia,serif;">${escapeHtml(siteConfig.name)}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 32px 8px;">
                <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#111827;">${escapeHtml(heading)}</h1>
                <div style="font-size:14px;line-height:1.6;color:#374151;">${bodyHtml}</div>
              </td>
            </tr>
            ${cta}
            <tr>
              <td style="padding:24px 32px 32px;">
                <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px;" />
                <p style="margin:0;font-size:12px;color:#9ca3af;">
                  Need help? Contact us at
                  <a href="mailto:${escapeHtml(siteConfig.supportEmail)}" style="color:#9ca3af;">${escapeHtml(siteConfig.supportEmail)}</a>.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Every template's plain-text part ends with this — matches the layout's footer so the text-only
 * version isn't missing the one piece of information (support contact) the HTML version always has. */
export function renderPlainTextFooter(): string {
  return `\n—\n${siteConfig.name}\nNeed help? Contact us at ${siteConfig.supportEmail}`;
}
