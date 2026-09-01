import { createBrowserClient } from "@supabase/ssr";

import { getClientEnv } from "@/lib/env";

/**
 * Browser Supabase client — use only inside Client Components.
 * Server Components/Actions must use `createServerSupabaseClient` instead.
 *
 * Untyped until `src/types/database.types.ts` is regenerated from the real
 * schema — see the comment there for why a placeholder generic isn't used.
 */
export function createClient() {
  const env = getClientEnv();
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
