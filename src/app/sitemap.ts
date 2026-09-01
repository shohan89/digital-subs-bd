import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo";
import { createAdminClient } from "@/lib/supabase/admin";
import { categoriesService, productsService } from "@/services";

// Regenerated at most once an hour — matches `/category/[slug]`'s own `revalidate = 3600`, so the
// sitemap's `lastModified` values never claim to be fresher than the pages they describe actually
// are.
export const revalidate = 3600;

/**
 * Every entry here is generated from `listCategories`/`listProducts` with **no options passed** —
 * both already hardcode `.eq("status", "active")` (see `categories.service.ts`/
 * `products.service.ts`) and return every matching row unpaginated when called this way, so
 * "active public products and categories" falls out of the query itself rather than a filter
 * applied here. `createAdminClient()` (service-role, no `cookies()` call) rather than
 * `createServerSupabaseClient()` — this route has no request-scoped session to speak of, and the
 * cookie-free client is what keeps this cacheable/`revalidate`-friendly, same reasoning as
 * `getPublicSettings()`.
 *
 * Deliberately excludes every `/admin/*`, `/dashboard/*`, `/checkout*`, `/cart`, `/order-tracking`,
 * `/login`, `/register`, `/forgot-password`, `/unauthorized`, `/forbidden` route — see
 * `robots.ts`'s `disallow` list, which excludes the exact same set for the same reason (private,
 * per-visitor, or auth-only content with no unique indexable value). If you add a new public,
 * genuinely indexable route, add it to *both* files.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = createAdminClient();

  const [categories, products] = await Promise.all([
    categoriesService.listCategories(db).catch(() => []),
    productsService.listProducts(db).catch(() => []),
  ]);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/shop"), changeFrequency: "hourly", priority: 0.9 },
    { url: absoluteUrl("/categories"), changeFrequency: "weekly", priority: 0.6 },
  ];

  const categoryEntries: MetadataRoute.Sitemap = categories.map((category) => ({
    url: absoluteUrl(`/category/${category.slug}`),
    lastModified: new Date(category.updatedAt),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: absoluteUrl(`/products/${product.slug}`),
    lastModified: new Date(product.updatedAt),
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [...staticEntries, ...categoryEntries, ...productEntries];
}
