import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/env.server";

/**
 * Service-role Supabase client — bypasses Row Level Security.
 * Server-only. Never import this from a Client Component or expose the key
 * to the browser. Reserved for admin operations and trusted background jobs
 * (webhooks, cron) that must act outside a specific user's RLS policies.
 *
 * Untyped until `src/types/database.types.ts` is regenerated from the real
 * schema — see the comment there for why a placeholder generic isn't used.
 */
export function createAdminClient() {
  const env = getServerEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
