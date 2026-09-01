import type { MetadataRoute } from "next";

import { siteConfig } from "@/constants/site";

/**
 * The `disallow` list is a deliberate mirror of every route this app already marks `noindex` at
 * the metadata level (see `(admin)/(dashboard)/(auth)/layout.tsx` and the individual `/cart`,
 * `/checkout*`, `/order-tracking`, `/unauthorized`, `/forbidden` pages in `lib/seo.ts`'s
 * `NOINDEX_ROBOTS` usages) — belt-and-suspenders, not redundant: a meta-robots tag only stops
 * *indexing* a page a crawler already fetched, while a `robots.txt` disallow stops the *fetch*
 * itself, saving crawl budget for the pages that actually matter (`/`, `/shop`, `/categories`,
 * `/category/*`, `/products/*`). Every prefix here blocks its whole subtree (`/admin` also covers
 * `/admin/dashboard`, `/admin/products/...`, etc. — robots.txt `Disallow` is a prefix match, no
 * trailing wildcard needed).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/dashboard",
        "/checkout",
        "/cart",
        "/order-tracking",
        "/login",
        "/register",
        "/forgot-password",
        "/unauthorized",
        "/forbidden",
        "/api",
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
