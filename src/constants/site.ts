import { z } from "zod";

// Validated here in isolation — deliberately NOT routed through `getClientEnv()`, even though
// that function validates this exact field correctly too. `getClientEnv()`'s schema *also*
// requires `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` to be present, and those two
// are unrelated to what this file needs — this file only cares about the site's own URL. That
// coupling was tried first and broke a real Cloudflare Workers Builds deploy: those two Supabase
// vars are configured as type "Secret" in the Cloudflare dashboard, and Cloudflare's *build*
// container doesn't expose Secret-type variables (only Variable-type ones) — they're only
// decrypted for the deployed Worker at runtime — so `getClientEnv()` correctly threw on them
// being unexpectedly missing during the build, even though `siteConfig.url` never needed them at
// all. Validating just `NEXT_PUBLIC_SITE_URL` on its own keeps the fail-fast behavior this was
// added for (a bare domain with no protocol used to crash `next build` deep inside `/categories`'
// metadata generation with an opaque `ERR_INVALID_URL` — see `lib/seo.ts`'s `new URL(path,
// siteConfig.url)`) without dragging in validation for fields this file has nothing to do with.
const siteUrl = z.string().url().default("http://localhost:3000").parse(process.env.NEXT_PUBLIC_SITE_URL);

export const siteConfig = {
  name: "Digital Subs BD",
  shortName: "DigitalSubsBD",
  description:
    "Bangladesh's premium marketplace for digital subscriptions — Netflix, YouTube Premium, Spotify, Canva Pro, ChatGPT Plus, Claude AI, Adobe Creative Cloud, CapCut Pro, Microsoft 365 and more.",
  url: siteUrl,
  ogImage: "/og.png",
  currency: "BDT",
  locale: "en-BD",
  supportEmail: "support@digitalsubsbd.com",
  links: {
    facebook: "https://facebook.com/digitalsubsbd",
    whatsapp: "https://wa.me/8800000000000",
  },
  /**
   * "Send Money" numbers shown at checkout for manual bKash/Nagad/Rocket verification (see
   * `payments.transaction_id`/`payments.screenshot` — there's no payment gateway integration,
   * the customer pays manually to these numbers and submits proof for an admin to verify).
   * Placeholder numbers — replace with the real merchant/personal numbers before launch.
   */
  payment: {
    bkash: { number: "01700-000000", type: "Personal" },
    nagad: { number: "01700-000000", type: "Personal" },
    rocket: { number: "01700-000000-1", type: "Personal" },
  },
} as const;
