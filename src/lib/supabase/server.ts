import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { getServerEnv } from "@/lib/env.server";

/**
 * Server Supabase client — use inside Server Components, Server Actions and
 * Route Handlers. Reads/writes the auth cookie via `next/headers`.
 *
 * Server Components can only *read* cookies, so the `setAll` call below is
 * wrapped in try/catch: it no-ops there and relies on `middleware.ts` to
 * refresh the session cookie on every request instead.
 *
 * Untyped until `src/types/database.types.ts` is regenerated from the real
 * schema — see the comment there for why a placeholder generic isn't used.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const env = getServerEnv();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component — middleware handles session refresh.
        }
      },
    },
  });
}
