import "server-only";

import { getServerEnv } from "@/lib/env.server";
import { ConsoleEmailProvider } from "@/services/email/providers/console-email-provider";
import { ResendEmailProvider } from "@/services/email/providers/resend-email-provider";
import type { EmailProvider } from "@/services/email/types";

let cached: EmailProvider | undefined;

/**
 * The one place in the app that knows which concrete `EmailProvider` is active — selected purely
 * from `EMAIL_PROVIDER` (an environment variable, not a code change), so switching providers later
 * never touches `email.service.ts`, a template, or any call site. This is what "don't hardcode a
 * specific email provider into business logic" means in practice: only this file (and the provider
 * classes themselves) may import from `providers/`.
 *
 * Falls back to `ConsoleEmailProvider` — logged once — if `EMAIL_PROVIDER=resend` but
 * `RESEND_API_KEY` isn't set, rather than throwing. A misconfigured email provider should degrade
 * to dev-safe logging, not take down checkout/payment/subscription flows that merely *also* want to
 * send an email — see `email.service.ts`'s own doc comment for why those call sites never let an
 * email failure propagate.
 */
export function getEmailProvider(): EmailProvider {
  if (cached) return cached;

  const env = getServerEnv();

  if (env.EMAIL_PROVIDER === "resend") {
    if (env.RESEND_API_KEY) {
      cached = new ResendEmailProvider(env.RESEND_API_KEY, { email: env.EMAIL_FROM_ADDRESS, name: env.EMAIL_FROM_NAME });
      return cached;
    }
    console.warn('EMAIL_PROVIDER is "resend" but RESEND_API_KEY is not set — falling back to the console email provider.');
  }

  cached = new ConsoleEmailProvider();
  return cached;
}
