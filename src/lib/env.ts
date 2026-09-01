import { z } from "zod";

/**
 * Client-safe environment access — only ever reads `NEXT_PUBLIC_*` variables, which Next.js
 * inlines into the browser bundle at build time regardless of whether this file is imported from
 * client or server code. Server-only variables (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`,
 * ...) live in `@/lib/env.server` instead, guarded by the `"server-only"` package so importing
 * that module from a Client Component fails the build — see that file's doc comment. Keeping this
 * split (rather than one file with both) is what makes that guard possible: `getClientEnv` is
 * genuinely imported from `lib/supabase/client.ts`, a Client Component dependency.
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

/** Safe to call from Client Components — only reads NEXT_PUBLIC_* variables. */
export function getClientEnv(): ClientEnv {
  return clientEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });
}
