import "server-only";

import type { EmailAddress, EmailMessage, EmailProvider, EmailSendResult } from "@/services/email/types";

function formatAddress(address: EmailAddress): string {
  return address.name ? `${address.name} <${address.email}>` : address.email;
}

/**
 * Development-safe default — logs the email instead of sending it, and never fails or needs
 * credentials. This is what `EMAIL_PROVIDER` resolves to with no environment configuration at all
 * (see `provider.ts`), so the app works out of the box with no transactional email account set up.
 * Switch to `resend` (or add another `EmailProvider`) only once real credentials exist.
 */
export class ConsoleEmailProvider implements EmailProvider {
  readonly name = "console";

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const to = Array.isArray(message.to) ? message.to.map(formatAddress).join(", ") : formatAddress(message.to);

    console.log(
      [
        "",
        "───────── 📧 email (console provider — not actually sent) ─────────",
        `To:      ${to}`,
        `Subject: ${message.subject}`,
        "",
        message.text,
        "─────────────────────────────────────────────────────────────────",
        "",
      ].join("\n"),
    );

    return { success: true };
  }
}
