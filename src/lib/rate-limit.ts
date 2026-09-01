import "server-only";

import { headers } from "next/headers";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Best-effort client IP for a rate-limit bucket key — not a security boundary on its own (a
 * spoofed/rotated IP just gets a fresh bucket), only an abuse-mitigation signal. Checks
 * `cf-connecting-ip` first since this app deploys to Cloudflare via OpenNext, where that header is
 * set by Cloudflare itself and can't be spoofed by the client (Cloudflare overwrites it at the
 * edge); falls back to `x-real-ip`/the first hop of `x-forwarded-for` for other environments
 * (`next dev`, a different host), which *are* client-settable there — acceptable, since the whole
 * point of this fallback chain is "best available signal," not a guarantee.
 */
async function getClientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export type RateLimitConfig = {
  /** Max calls allowed within `windowSeconds`. */
  limit: number;
  windowSeconds: number;
};

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/**
 * The one rate-limit check every flagged Server Action below goes through — backed by
 * `check_rate_limit()` (`supabase/migrations/20260901001000_security_audit_fixes.sql`), a Postgres
 * function doing an atomic `insert ... on conflict do update` increment, not an in-memory counter.
 * That's a deliberate choice, not the simplest option: this app deploys to Cloudflare via
 * OpenNext, a serverless/edge runtime with no guarantee two requests land on the same
 * instance/process, so an in-memory token bucket would silently under-count and provide no real
 * protection. Always called via `createAdminClient()` (service-role) — `rate_limits` has no RLS
 * policies at all, and rate limiting has to work for unauthenticated actions (login, order
 * tracking) where there's no session to scope a policy to anyway.
 *
 * Fails **open**, not closed: if the rate-limit check itself errors (a transient DB hiccup), the
 * action proceeds rather than blocking every login/checkout/etc. in the app over an unrelated
 * infrastructure blip — a rate limiter's own outage must never become a site-wide outage.
 */
export async function checkRateLimit(bucketKey: string, config: RateLimitConfig): Promise<RateLimitResult> {
  try {
    const db = createAdminClient();
    const { data, error } = await db.rpc("check_rate_limit", {
      p_bucket_key: bucketKey,
      p_limit: config.limit,
      p_window_seconds: config.windowSeconds,
    });

    if (error) {
      console.error(`Rate limit check failed for "${bucketKey}"`, error);
      return { allowed: true };
    }

    return data ? { allowed: true } : { allowed: false, retryAfterSeconds: config.windowSeconds };
  } catch (error) {
    console.error(`Rate limit check threw for "${bucketKey}"`, error);
    return { allowed: true };
  }
}

/** `"login:{ip}"`-style key for an action with no authenticated user yet (login, register,
 * forgot-password, order tracking) — the IP is the only signal available. */
export async function rateLimitKeyByIp(prefix: string): Promise<string> {
  return `${prefix}:${await getClientIp()}`;
}

/** `"{prefix}:{email}"` — for actions where the target identity (not the caller) is what abuse
 * would be aimed at, e.g. password-reset email-bombing a specific address regardless of which IP
 * sends the requests. Lowercased so `Foo@Example.com`/`foo@example.com` share one bucket. */
export function rateLimitKeyByEmail(prefix: string, email: string): string {
  return `${prefix}:${email.trim().toLowerCase()}`;
}

/** `"{prefix}:{userId}"` — for actions gated behind `requireUser()`, where the authenticated
 * caller's own id is a stronger, non-spoofable signal than their IP. */
export function rateLimitKeyByUser(prefix: string, userId: string): string {
  return `${prefix}:${userId}`;
}

export function rateLimitErrorMessage(retryAfterSeconds: number): string {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return `Too many attempts. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}
