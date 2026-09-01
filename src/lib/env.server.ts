import "server-only";
import { z } from "zod";

/**
 * Validates process.env once at startup so a missing/misconfigured variable
 * fails fast with a clear message instead of surfacing as a cryptic runtime
 * error deep inside a Supabase call.
 *
 * Split from `env.ts` (which keeps only the client-safe `getClientEnv`) specifically so the
 * `"server-only"` import above can guard this module alone — `getClientEnv` is genuinely imported
 * from Client Components (`lib/supabase/client.ts`), so it can't share a module with anything
 * carrying this guard. Importing anything from this file into a Client Component now fails the
 * build immediately (verified directly: a throwaway Client Component importing `getServerEnv`
 * fails `next build` with "You're importing a component that needs ... server-only ...");
 * previously this only would have surfaced as `SUPABASE_SERVICE_ROLE_KEY` etc. reading back
 * `undefined` in the browser bundle — no leaked secret, but a much later and less obvious failure.
 */
const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  /** Which `EmailProvider` `services/email/provider.ts` resolves to — defaults to the dev-safe
   * console logger so the app works with zero email configuration. Never imported by business
   * logic directly; only `services/email/provider.ts` reads this. */
  EMAIL_PROVIDER: z.enum(["console", "resend"]).default("console"),
  EMAIL_FROM_ADDRESS: z.string().email().default("no-reply@digitalsubsbd.com"),
  EMAIL_FROM_NAME: z.string().min(1).default("Digital Subs BD"),
  /** Only required when `EMAIL_PROVIDER=resend` — validated in `provider.ts`, not here, so a
   * `console`-provider deployment never needs this set at all. */
  RESEND_API_KEY: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

/** Server-only. Throws if a required environment variable is missing or invalid. */
export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `- ${issue.path.join(".")}: ${issue.message}`).join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }

  cached = parsed.data;
  return cached;
}
