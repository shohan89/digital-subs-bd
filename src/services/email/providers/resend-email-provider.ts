import "server-only";

import type { EmailAddress, EmailMessage, EmailProvider, EmailSendResult } from "@/services/email/types";

const RESEND_API_URL = "https://api.resend.com/emails";

function formatAddress(address: EmailAddress): string {
  return address.name ? `${address.name} <${address.email}>` : address.email;
}

/**
 * Talks to Resend's REST API directly via `fetch` rather than the `resend` npm package — this
 * provider is the only file in the app that knows Resend's request/response shape, so adding the
 * SDK later (if its typed client is ever worth the dependency) only touches this one file, not any
 * caller. Constructed only from `provider.ts`, never directly — see that file for how/when this
 * one gets selected over `ConsoleEmailProvider`.
 */
export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";

  constructor(
    private readonly apiKey: string,
    private readonly from: EmailAddress,
  ) {}

  async send(message: EmailMessage): Promise<EmailSendResult> {
    try {
      const response = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: formatAddress(this.from),
          to: Array.isArray(message.to) ? message.to.map(formatAddress) : [formatAddress(message.to)],
          subject: message.subject,
          html: message.html,
          text: message.text,
          reply_to: message.replyTo,
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        return { success: false, error: `Resend API error ${response.status}: ${body.slice(0, 500)}` };
      }

      const data = (await response.json()) as { id?: string };
      return { success: true, id: data.id };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown error calling Resend" };
    }
  }
}
