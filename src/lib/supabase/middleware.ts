import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getServerEnv } from "@/lib/env.server";

/**
 * Refreshes the Supabase auth session cookie on every request.
 * Called from `src/middleware.ts` — keep this framework-agnostic of routing
 * decisions (redirects for protected routes live in the middleware itself).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const env = getServerEnv();

  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // `supabase` is returned too, not just `user` — `src/middleware.ts` needs it for the one path
  // that requires a role lookup (an already-authenticated request landing on /login etc.), but
  // deliberately doesn't query `profiles` here on every single request.
  return { response, user, supabase };
}
