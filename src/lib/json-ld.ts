import { siteConfig } from "@/constants/site";
import { absoluteUrl } from "@/lib/seo";
import type { RatingSummary } from "@/services/reviews.service";
import type { Product } from "@/types/product";
import type { SiteSettings } from "@/types/settings";

/** A generic JSON-LD node — every builder below returns this rather than a specific schema.org
 * TypeScript type (none is bundled with this project, and hand-rolling one for every `@type` used
 * here isn't worth it for markup that's serialized straight to a `<script>` tag). */
export type JsonLdNode = Record<string, unknown>;

export type BreadcrumbItem = { name: string; path: string };

/**
 * `BreadcrumbList` — every indexable page below the homepage renders this via
 * `components/shared/breadcrumbs.tsx`, which builds both the *visible* breadcrumb trail and this
 * JSON-LD from the same `items` array. Keeping them backed by one array is deliberate: Google's
 * structured-data guidelines expect markup to reflect what's actually visible on the page, not
 * describe a hierarchy the visitor can't also see.
 */
export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** `Organization` — rendered once, on the homepage only (see `(marketing)/page.tsx`), the
 * canonical placement Google's own documentation recommends rather than repeating an identical
 * block on every public page. `sameAs` only lists social links an admin has actually configured
 * (`/admin/settings`' Social section) — an empty/placeholder URL would be worse than omitting the
 * field. */
export function buildOrganizationJsonLd(settings: SiteSettings | null): JsonLdNode {
  const storeName = settings?.general.storeName ?? siteConfig.name;
  const sameAs = [settings?.social.facebook, settings?.social.instagram, settings?.social.youtube].filter(
    (url): url is string => !!url,
  );

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: storeName,
    url: siteConfig.url,
    ...(sameAs.length > 0 && { sameAs }),
    ...(settings?.general.supportEmail && {
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: settings.general.supportEmail,
        ...(settings.general.supportPhone && { telephone: settings.general.supportPhone }),
      },
    }),
  };
}

/** `WebSite` + a `SearchAction` pointing at `/shop`'s search param — separate from `Organization`
 * (a different `@type` describing the site-as-searchable-thing rather than the business entity),
 * same homepage-only placement. */
export function buildWebsiteJsonLd(settings: SiteSettings | null): JsonLdNode {
  const storeName = settings?.general.storeName ?? siteConfig.name;

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: storeName,
    url: siteConfig.url,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteConfig.url}/shop?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

/** "Requirements actually satisfied" for `AggregateRating`, per schema.org/Google's own guidance:
 * at least one rating, and a non-zero average (an average can only be zero when `count` is also
 * zero given how `getRatingSummary` computes it, but this keeps the check self-contained rather
 * than relying on that implementation detail elsewhere). */
export function isAggregateRatingEligible(ratingSummary: RatingSummary): boolean {
  return ratingSummary.count > 0 && ratingSummary.average > 0;
}

/**
 * `Product`, with `AggregateRating` included only when `isAggregateRatingEligible`. Deliberately
 * **no individual `Review` nodes** — schema.org/Google's Review markup requires a distinguishable
 * `author`, and `ProductReviews`/`AdminReview` (see PROJECT_STRUCTURE.md's Product reviews section)
 * never display an individual reviewer's name publicly (every review renders as "Verified
 * customer" — `reviewer_name`/`reviewer_email` are staff-only fields). Fabricating a uniform
 * "Verified Customer" author across several distinct `Review` nodes would misrepresent what's
 * actually visible on the page and reads as exactly the kind of pattern Google's spam-detection for
 * manipulated reviews flags — so "review structured data only when requirements are actually
 * satisfied" resolves here to aggregate-only, not add individual reviews with a fabricated author.
 *
 * Also `offers.seller` (Digital Subs BD, the actual merchant of record) rather than `brand` — these
 * products resell third-party subscriptions (Netflix, Spotify, ...), so the accurate `brand` would
 * be that third party, not this store; with no `brand` column in this schema to source it from
 * correctly, omitting the field is more accurate than guessing.
 */
export function buildProductJsonLd(product: Product, ratingSummary: RatingSummary): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription ?? product.description ?? undefined,
    image: product.image ? absoluteUrl(product.image) : undefined,
    category: product.category?.name,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: siteConfig.currency,
      availability: "https://schema.org/InStock",
      url: absoluteUrl(`/products/${product.slug}`),
      seller: { "@type": "Organization", name: siteConfig.name },
    },
    ...(isAggregateRatingEligible(ratingSummary) && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: Math.round(ratingSummary.average * 10) / 10,
        reviewCount: ratingSummary.count,
      },
    }),
  };
}

/** `CollectionPage` for a category, with an `ItemList` of the products actually rendered in its
 * grid — `products` should be exactly what the page passed to `ProductGrid`, not a separate/larger
 * fetch, so the markup never claims more items than a visitor can actually see. */
export function buildCategoryJsonLd(
  category: { name: string; description: string | null; slug: string },
  products: { name: string; slug: string }[],
): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: category.name,
    description: category.description ?? undefined,
    url: absoluteUrl(`/category/${category.slug}`),
    ...(products.length > 0 && {
      mainEntity: {
        "@type": "ItemList",
        itemListElement: products.map((product, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: absoluteUrl(`/products/${product.slug}`),
          name: product.name,
        })),
      },
    }),
  };
}

export type Faq = { question: string; answer: string };

/** "Only where eligible and appropriate": every entry needs a non-empty question and answer — a
 * `Question` node with a blank `name` or an `Answer` with blank `text` isn't valid schema.org
 * markup, so this is checked before ever building `FAQPage` JSON-LD, not assumed from the caller
 * always passing well-formed data. */
export function isFaqEligible(faqs: Faq[]): boolean {
  return faqs.length > 0 && faqs.every((faq) => faq.question.trim().length > 0 && faq.answer.trim().length > 0);
}

/** `FAQPage` — call sites (`ProductFaq`/`CategoryFaq`/the homepage `Faq`) must check
 * `isFaqEligible` themselves and render nothing when it fails, since this returns `null` rather
 * than throwing (a template producing an empty answer shouldn't take down the page's structured
 * data, just omit it for that render). */
export function buildFaqJsonLd(faqs: Faq[]): JsonLdNode | null {
  if (!isFaqEligible(faqs)) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}
