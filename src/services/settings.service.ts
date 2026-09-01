import type { DbClient } from "@/services/types";
import type { SettingsSection, SiteSettings } from "@/types/settings";

/**
 * Fallback values if a section's row is somehow missing (a fresh DB before the seed migration
 * runs, or a row deleted by hand) — mirrors the old hardcoded `siteConfig` constant's values, so
 * the site never renders empty strings for a config row that hasn't been customized yet. The seed
 * migration (`20260901000500_seed_settings.sql`) inserts these same values as real rows on
 * `on conflict (key) do nothing`, so in practice this fallback rarely fires — it's a safety net,
 * not the primary source of truth.
 */
const DEFAULT_SETTINGS: SiteSettings = {
  general: {
    storeName: "Digital Subs BD",
    storeDescription:
      "Bangladesh's premium marketplace for digital subscriptions — Netflix, YouTube Premium, Spotify, Canva Pro, ChatGPT Plus, Claude AI, Adobe Creative Cloud, CapCut Pro, Microsoft 365 and more.",
    supportEmail: "support@digitalsubsbd.com",
    supportPhone: "",
    whatsappNumber: "8801700000000",
  },
  payment: {
    bkashNumber: "01700-000000",
    nagadNumber: "01700-000000",
    rocketNumber: "01700-000000-1",
  },
  delivery: {
    defaultDeliveryTime: "Instant to 30 minutes after payment confirmation",
    supportHours: "9:00 AM – 11:00 PM, 7 days a week",
  },
  seo: {
    siteTitle: "Digital Subs BD",
    metaDescription:
      "Buy Netflix, AI Tools, Design Software and Premium Digital Services at the best price in Bangladesh. Instant delivery, secure payment, 24/7 support.",
    ogImage: "/og.png",
  },
  social: {
    facebook: "https://facebook.com/digitalsubsbd",
    instagram: "",
    youtube: "",
    whatsapp: "https://wa.me/8801700000000",
  },
};

/**
 * `settings` is admin-only at every RLS level (`"Settings: admin full access"`, `for all`, no
 * public/customer policy at all — see that table's own migration comment, which deliberately
 * deferred a public policy until a real need showed up). None of the five sections here are
 * *secret* (store name, contact info, payment numbers already shown at checkout, social links, SEO
 * copy are all meant to be publicly visible), but the table itself still isn't public-readable —
 * a page that needs to *display* a setting reads it server-side on the service-role client
 * (`createAdminClient()`, same as every other RLS-gap read in this app) and only ever forwards the
 * specific fields it needs into the rendered page, never the raw table. This keeps the RLS policy
 * itself simple and tight (exactly what "use appropriate database access policies" asks for)
 * without inventing a second, narrower public-read policy for a table that has no per-row
 * ownership concept to scope one by.
 *
 * **Never add a secret (an API key, a webhook signing secret, a gateway credential) as a new
 * settings key.** This table is for display/business config only — secrets belong in environment
 * variables (`src/lib/env.ts`) or a real secret store, not here, regardless of how tempting it is
 * to make a secret "admin-editable" the same way these fields are.
 */
export async function getSettings(db: DbClient): Promise<SiteSettings> {
  const { data, error } = await db.from("settings").select("key, value");
  if (error) throw error;

  const bySection = Object.fromEntries((data ?? []).map((row) => [row.key, row.value]));

  return {
    general: { ...DEFAULT_SETTINGS.general, ...bySection.general },
    payment: { ...DEFAULT_SETTINGS.payment, ...bySection.payment },
    delivery: { ...DEFAULT_SETTINGS.delivery, ...bySection.delivery },
    seo: { ...DEFAULT_SETTINGS.seo, ...bySection.seo },
    social: { ...DEFAULT_SETTINGS.social, ...bySection.social },
  };
}

/** One section at a time (`key = "general"`/`"payment"`/`"delivery"`/`"seo"`/`"social"`) — matches
 * the admin page's five independent per-section forms/save buttons. `onConflict: "key"` makes this
 * a real upsert even before the seed migration's rows exist. */
export async function updateSettingsSection<K extends SettingsSection>(
  db: DbClient,
  section: K,
  value: SiteSettings[K],
): Promise<void> {
  const { error } = await db.from("settings").upsert({ key: section, value }, { onConflict: "key" });
  if (error) throw error;
}
