import "server-only";

import { cache } from "react";

import { createAdminClient } from "@/lib/supabase/admin";
import { settingsService } from "@/services";
import type { SiteSettings } from "@/types/settings";

/**
 * For public-facing pages/layouts/components that need to *display* settings (store name, contact
 * info, payment numbers, social links, SEO copy) — `settings`' RLS is admin-only (see that table's
 * migration), so a customer/anonymous session can't read it directly. Uses the service-role client
 * specifically because `createAdminClient()` never calls `cookies()` (unlike
 * `createServerSupabaseClient()`), which matters beyond the RLS bypass: it's what makes this safe
 * to call even from the shared layout wrapping `/category/[slug]`, the one statically-generated
 * page in this app — a `cookies()`-using fetch there would silently break its static generation
 * (see that page's own note). Read-only; admin edits still go through
 * `createServerSupabaseClient()` + `requireAdmin()` in `settings.actions.ts`.
 *
 * `cache()`-wrapped at the source, not per-call-site — this is called independently from multiple
 * layouts/pages/components in the same request tree (root layout, `(marketing)`/`(dashboard)`
 * layouts, the homepage, `Hero`'s nested `HeroContactSupportButton`, `/products/[slug]`,
 * `/checkout`, `/order-tracking`, ...), and none of those call sites know about each other's
 * fetches. Wrapping here dedupes all of them into one Supabase round-trip per request
 * automatically, instead of relying on every call site to remember its own local `cache()`
 * wrapper (a real gap found while auditing this: a single homepage request was issuing 4 separate
 * `settings` table fetches before this fix).
 */
export const getPublicSettings = cache(async (): Promise<SiteSettings> => {
  const db = createAdminClient();
  return settingsService.getSettings(db);
});
