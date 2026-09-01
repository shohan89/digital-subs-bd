import { cache, Suspense } from "react";
import type { Metadata } from "next";

import { JsonLd } from "@/components/shared/json-ld";
import {
  CategoriesSection,
  Faq,
  FeaturedProducts,
  FinalCta,
  Hero,
  HowItWorks,
  SectionSkeleton,
  Testimonials,
  WhyChooseUs,
} from "@/components/marketing";
import { siteConfig } from "@/constants/site";
import { buildOrganizationJsonLd, buildWebsiteJsonLd } from "@/lib/json-ld";
import { buildMetadata } from "@/lib/seo";
import { getPublicSettings } from "@/lib/settings";

// Cacheable now that every data-fetching section in this tree (`CategoriesSection`,
// `FeaturedProducts`, `Testimonials`, and `getPublicSettings` itself) uses a cookie-free Supabase
// client — none of them call `cookies()`, so nothing forces this route dynamic. Public,
// rarely-changing data (active categories/products, approved reviews, site settings) only; matches
// `/category/[slug]`'s existing `revalidate = 3600`. Never add a page here that reads
// session/customer-specific data without reconsidering this.
export const revalidate = 3600;

// `cache()`-wrapped so `generateMetadata` and `HomeJsonLd` (both fetch settings independently,
// same as `loadProduct`/`loadCategory` elsewhere) share one request-scoped fetch instead of two.
const loadSettings = cache(() => getPublicSettings().catch(() => null));

// Async purely for metadata resolution — this doesn't affect the page component below, which
// stays synchronous so Hero/Why Choose Us/How It Works/FAQ/Final CTA keep painting immediately
// (metadata resolves separately from, and doesn't block, the page body's own streaming).
export async function generateMetadata(): Promise<Metadata> {
  const settings = await loadSettings();
  const title = settings ? `${settings.seo.siteTitle} — Premium Digital Subscriptions` : "Premium Digital Subscriptions in Bangladesh";
  const description =
    settings?.seo.metaDescription ??
    "Buy Netflix, AI Tools, Design Software and Premium Digital Services at the best price in Bangladesh. Instant delivery, secure payment, 24/7 support.";

  return {
    ...buildMetadata({
      title,
      description,
      path: "/",
      image: settings?.seo.ogImage || undefined,
      siteName: settings?.general.storeName ?? siteConfig.name,
    }),
    // `{ absolute }`, not a plain string — the homepage's title is already the full "Brand —
    // Tagline" form, so it must bypass the root layout's `%s | {brand}` template instead of
    // getting the brand name appended a second time (every other page's title *should* go through
    // that template; this is the one deliberate exception).
    title: { absolute: title },
  };
}

// Its own tiny async Server Component + `Suspense` boundary, same reasoning as
// `HeroContactSupportButton` — `HomePage` itself must stay synchronous, so the one part of it that
// needs a data fetch (Organization/WebSite JSON-LD, sourced from live settings) streams in
// separately instead of blocking the whole page. A `null` fallback is fine here: these are
// invisible `<script>` tags, not visible UI, so there's nothing to show a placeholder for.
// `Faq` (rendered below) builds its own `FAQPage` JSON-LD internally, from the same array it
// renders — not this component's concern.
async function HomeJsonLd() {
  const settings = await loadSettings();
  return <JsonLd data={[buildOrganizationJsonLd(settings), buildWebsiteJsonLd(settings)]} />;
}

// Each data-fetching section is its own Suspense boundary so the static sections (Hero, Why
// Choose Us, How It Works, FAQ, Final CTA) paint immediately instead of waiting on Supabase.
export default function HomePage() {
  return (
    <>
      <Suspense fallback={null}>
        <HomeJsonLd />
      </Suspense>

      <Hero />
      <Suspense fallback={<SectionSkeleton cards={4} />}>
        <CategoriesSection />
      </Suspense>
      {/* Matches `ProductGrid`'s default columns (`FeaturedProducts` renders it with no override,
          unlike `/shop`'s 3-column override) — 1 col on mobile, not `SectionSkeleton`'s 2-col default. */}
      <Suspense fallback={<SectionSkeleton cards={4} gridClassName="grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4" />}>
        <FeaturedProducts />
      </Suspense>
      <WhyChooseUs />
      <HowItWorks />
      {/* Matches `Testimonials`' own grid exactly (1/2/3 columns) — `SectionSkeleton`'s 2/2/4
          default doesn't apply here at any breakpoint. */}
      <Suspense fallback={<SectionSkeleton cards={3} gridClassName="grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" />}>
        <Testimonials />
      </Suspense>
      <Faq />
      <FinalCta />
    </>
  );
}
