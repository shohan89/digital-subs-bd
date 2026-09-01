/** A single recipient/sender — kept as `{ email, name? }` rather than a pre-formatted string so a
 * provider can format it however its API expects (`"Name <email>"` for Resend, separate fields for
 * others). */
export type EmailAddress = { email: string; name?: string };

export type EmailMessage = {
  to: EmailAddress | EmailAddress[];
  subject: string;
  /** Full HTML body — always paired with `text` below, never sent alone (some inboxes/clients
   * prefer or require a plain-text part). */
  html: string;
  text: string;
  replyTo?: string;
};

export type EmailSendResult = { success: true; id?: string } | { success: false; error: string };

/**
 * The one seam every concrete provider (`providers/console-email-provider.ts`,
 * `providers/resend-email-provider.ts`, or a future one) implements — `email.service.ts` and every
 * caller of it only ever depend on this interface, never on a specific provider's SDK/API shape.
 * That's what "don't hardcode a specific email provider into business logic" means in code: no
 * file outside `services/email/` should import from `providers/` directly.
 */
export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<EmailSendResult>;
}
