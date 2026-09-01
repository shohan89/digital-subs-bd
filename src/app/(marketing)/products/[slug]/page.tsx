import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { Container } from "@/components/shared/container";
import { JsonLd } from "@/components/shared/json-ld";
import {
  DeliveryInfo,
  DeliverySteps,
  FeatureList,
  PaymentMethodsList,
  ProductBadge,
  ProductFaq,
  ProductGallery,
  ProductPurchasePanel,
  ProductRating,
  ProductReviews,
} from "@/features/products/components";
import { ROUTES } from "@/constants/routes";
import { siteConfig } from "@/constants/site";
import { buildProductJsonLd } from "@/lib/json-ld";
import { buildMetadata, NOINDEX_ROBOTS } from "@/lib/seo";
import { getPublicSettings } from "@/lib/settings";
import { createStaticSupabaseClient } from "@/lib/supabase/static";
import { productsService, reviewsService } from "@/services";
import type { RatingSummary } from "@/services/reviews.service";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

// `cache()` dedupes this across `generateMetadata` and the page component within one request —
// without it, a fetch failure logs (and fails) twice for a single page view. Cookie-free client —
// this fetch is public, active-product data with nothing session-specific in it. That said, this
// page does *not* export `revalidate`/become statically cacheable the way `/category/[slug]` and
// the homepage do: `ProductReviews` (rendered below) calls `getCurrentUser()` to compute the
// signed-in visitor's own review-submission eligibility, which is genuinely per-visitor and must
// stay dynamic — "cache safe public data, never private customer data" cuts the other way here.
// Converting just this fetch and the rating-summary fetch below still reduces cookie-based session
// round-trips even though the overall route can't be static while `ProductReviews` needs one.
const loadProduct = cache(async (slug: string) => {
  const supabase = createStaticSupabaseClient();
  return productsService.getProductBySlug(supabase, slug);
});

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  // A load failure here must not throw: an error in `generateMetadata` shouldn't decide the
  // page's error/not-found behavior — that's the page component's job. Fall back to defaults.
  const product = await loadProduct(slug).catch(() => null);
  // Explicit `noindex`, not an empty `{}` — a bad/removed slug shouldn't briefly inherit the
  // parent's indexable defaults before `notFound()` renders (see PROJECT_STRUCTURE.md's SEO
  // section for why this matters even though the response ends up 404 either way).
  if (!product) return { robots: NOINDEX_ROBOTS };

  const description = product.shortDescription ?? product.description?.slice(0, 160) ?? siteConfig.description;

  return buildMetadata({
    title: product.name,
    description,
    path: ROUTES.product(product.slug),
    image: product.image,
  });
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  // Same pattern as the homepage's data-fetching sections: catch this explicitly rather than
  // let it throw up to the route's error.tsx. A fetch failure and "no such product" need to look
  // different to the visitor — bubbling both through `notFound()`/an uncaught throw the same way
  // would make a real outage indistinguishable from a product that doesn't exist.
  let product;
  try {
    product = await loadProduct(slug);
  } catch {
    return (
      <Container className="py-16">
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertDescription>Couldn&apos;t load this product right now. Please try again shortly.</AlertDescription>
        </Alert>
      </Container>
    );
  }

  if (!product) notFound();

  // Non-critical — a failure here shouldn't block the rest of the page, just show "No reviews yet".
  // Cookie-free client, same reasoning as `loadProduct` above — an aggregate rating over approved
  // reviews is public data, not tied to who's viewing.
  let ratingSummary: RatingSummary = { average: 0, count: 0 };
  try {
    const supabase = createStaticSupabaseClient();
    ratingSummary = await reviewsService.getRatingSummary(supabase, product.id);
  } catch {
    // leave the default
  }

  // Non-critical — `ProductPurchasePanel`'s "Buy Now" falls back to `siteConfig`'s hardcoded
  // WhatsApp number on a fetch failure rather than block the whole product page.
  const whatsappNumber = await getPublicSettings()
    .then((settings) => settings.general.whatsappNumber)
    .catch(() => siteConfig.links.whatsapp.replace(/\D/g, ""));

  const galleryImages = [product.image, ...product.gallery].filter((url): url is string => Boolean(url));

  const breadcrumbItems = product.category
    ? [
        { name: "Home", path: "/" },
        { name: "Shop", path: "/shop" },
        { name: product.category.name, path: ROUTES.category(product.category.slug) },
        { name: product.name, path: ROUTES.product(product.slug) },
      ]
    : [
        { name: "Home", path: "/" },
        { name: "Shop", path: "/shop" },
        { name: product.name, path: ROUTES.product(product.slug) },
      ];

  return (
    <>
      <JsonLd data={buildProductJsonLd(product, ratingSummary)} />

      <Container className="py-16">
        <Breadcrumbs items={breadcrumbItems} className="mb-6" />
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <ProductGallery images={galleryImages} productName={product.name} />

          <div className="flex flex-col gap-4">
            {product.category && (
              <Link
                href={ROUTES.productsByCategory(product.category.slug)}
                className="text-xs font-medium tracking-wide text-primary uppercase hover:underline"
              >
                {product.category.name}
              </Link>
            )}

            <div className="flex items-start justify-between gap-3">
              <h1 className="font-heading text-3xl font-semibold tracking-tight">{product.name}</h1>
              <ProductBadge product={product} className="mt-1 shrink-0" />
            </div>

            <ProductRating average={ratingSummary.average} count={ratingSummary.count} />

            {product.shortDescription && <p className="text-muted-foreground">{product.shortDescription}</p>}

            <ProductPurchasePanel product={product} whatsappNumber={whatsappNumber} />

            <FeatureList features={product.features} limit={4} className="mt-2" />

            <div className="mt-2 flex flex-col gap-4 border-t border-border/60 pt-4">
              <DeliveryInfo />
              <PaymentMethodsList />
            </div>
          </div>
        </div>

        {product.description && (
          <section className="mt-16 border-t border-border/60 pt-10">
            <h2 className="font-heading text-xl font-semibold tracking-tight">Product Description</h2>
            <p className="mt-3 text-sm whitespace-pre-line text-muted-foreground">{product.description}</p>
          </section>
        )}

        {product.features.length > 0 && (
          <section className="mt-16 border-t border-border/60 pt-10">
            <h2 className="font-heading text-xl font-semibold tracking-tight">Features</h2>
            <FeatureList features={product.features} className="mt-3 gap-2.5" />
          </section>
        )}
      </Container>

      <DeliverySteps />
      <ProductFaq productName={product.name} />
      <ProductReviews productId={product.id} />
    </>
  );
}
