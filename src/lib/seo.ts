import type { Metadata } from "next";

import { siteConfig } from "@/constants/site";

/** Absolute URL from a site-relative path — every canonical/`openGraph.url`/JSON-LD `url` field in
 * this app goes through this, so the origin only needs to be right in one place
 * (`siteConfig.url`, itself `NEXT_PUBLIC_SITE_URL`). */
export function absoluteUrl(path: string): string {
  return new URL(path, siteConfig.url).toString();
}

/** Every non-public route (admin/dashboard/auth/cart/checkout/order-tracking/error pages) sets
 * this — see `buildMetadata`'s `noIndex` shortcut and the three route-group layouts
 * ((admin)/(dashboard)/(auth)) that apply it to every page under them at once. `follow: false` too:
 * a `noindex` page's outbound links (e.g. an admin table's row-detail links) shouldn't pass crawl
 * signal either. */
export const NOINDEX_ROBOTS: NonNullable<Metadata["robots"]> = { index: false, follow: false };

export type BuildMetadataInput = {
  title: string;
  description: string;
  /** Site-relative path this page's canonical URL and `openGraph.url` resolve to — every indexable
   * page passes its own, so no two pages can ever share a canonical (see the sitemap/robots
   * doc comment in PROJECT_STRUCTURE.md's SEO section for the fuller "why"). */
  path: string;
  /** Absolute or root-relative image URL. Omitted → no `openGraph.images`/`twitter.images` at all
   * (falls back to whatever the root layout's own default resolves to), not a broken/empty image. */
  image?: string | null;
  imageAlt?: string;
  siteName?: string;
  /** Set only on a genuinely non-indexable page (see `NOINDEX_ROBOTS`). Omit entirely for a normal
   * public page — `undefined` lets the nearest ancestor's `robots` (root layout's implicit
   * `index: true` default, or a route-group layout's `NOINDEX_ROBOTS`) flow through unchanged. */
  noIndex?: boolean;
};

/**
 * The one helper every indexable page's `generateMetadata` builds its return value through —
 * title, description, a self-referencing canonical, a matching Open Graph object, and a Twitter
 * card, all from the same handful of inputs so they can never drift out of sync with each other
 * (a mismatched canonical vs. `openGraph.url`, say). Reach for this before hand-assembling a
 * `Metadata` object inline; see `PROJECT_STRUCTURE.md`'s SEO section for which pages already use
 * it and why the few that don't (the root layout itself, and the noindex-only utility pages that
 * just need `{ title, robots: NOINDEX_ROBOTS }`) are exceptions.
 */
export function buildMetadata(input: BuildMetadataInput): Metadata {
  const { title, description, path, image, imageAlt, siteName = siteConfig.name, noIndex } = input;
  const url = absoluteUrl(path);

  return {
    title,
    description,
    alternates: { canonical: path },
    robots: noIndex ? NOINDEX_ROBOTS : undefined,
    openGraph: {
      title,
      description,
      url,
      siteName,
      type: "website",
      locale: siteConfig.locale,
      images: image ? [{ url: absoluteUrl(image), alt: imageAlt ?? title }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [absoluteUrl(image)] : undefined,
    },
  };
}

/**
 * `/shop`'s canonical, collapsing every filter/sort/pagination permutation down to at most one
 * URL per category — this is what "prevent duplicate canonical URLs" means for a filterable list
 * page. `search`/`sort`/`page` never appear in a canonical (they don't represent meaningfully
 * different indexable content — a search result is user-input-dependent, a sort order is a
 * re-ordering of the same items, and pagination should consolidate to the collection itself, not
 * fan out into N indexable near-duplicates); `category` does, since `/shop?category=x` is a
 * genuinely different, worth-indexing item set from bare `/shop`. Every combination of filters
 * against the *same* category therefore converges on exactly one canonical URL.
 */
export function buildShopCanonicalPath(categorySlug: string | undefined): string {
  return categorySlug ? `/shop?category=${encodeURIComponent(categorySlug)}` : "/shop";
}
