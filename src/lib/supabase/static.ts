import { createClient } from "@supabase/supabase-js";

import { getClientEnv } from "@/lib/env";

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_ATTEMPTS = 3;

// next build's static-generation worker gives each page a single ~60s budget across all its
// retries; an occasional stalled connection to Supabase (seen from some build environments) can
// eat that whole budget on one hung request with no chance to retry. Timing out and retrying
// client-side keeps a single bad connection from blocking the page entirely.
async function resilientFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

/**
 * Anon-key client with no cookie/session handling at all — for public data fetching in contexts
 * that must not be forced into dynamic rendering, like `generateStaticParams` or a statically
 * generated public page. `createServerSupabaseClient` (`server.ts`) reads cookies via
 * `next/headers`, which alone marks a route dynamic regardless of whether the page actually needs
 * the session — this client sidesteps that entirely.
 *
 * RLS "public read" policies apply exactly as they would for any anonymous visitor. Never use
 * this for anything that depends on the signed-in user — it has no session to read.
 */
export function createStaticSupabaseClient() {
  const env = getClientEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { fetch: resilientFetch },
  });
}
