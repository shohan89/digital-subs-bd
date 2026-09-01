import type { Metadata } from "next";
import { Geist, Space_Grotesk } from "next/font/google";

import { Providers } from "@/components/providers";
import { siteConfig } from "@/constants/site";
import { getPublicSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

import "./globals.css";

// `display: "swap"` is next/font's own default already — set explicitly so it's a documented
// choice, not an implicit one: text renders immediately in a fallback face and swaps once the
// self-hosted font downloads, rather than an invisible-text wait (`display: "block"`/"optional").
const geist = Geist({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
// Distinct display/heading face — pairs with Geist body text for the brand's futuristic feel.
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-heading", display: "swap" });

// Async so the title/description/OG defaults reflect `/admin/settings`'s SEO section — falls back
// to `siteConfig`'s hardcoded defaults on a fetch failure (DB unreachable at build time, say)
// rather than let a metadata failure take down every page's `<head>`.
//
// These are *site-wide defaults* — every field a child route's `generateMetadata` doesn't set
// itself (see `lib/seo.ts`'s `buildMetadata`) falls through to what's defined here, per Next's
// metadata-merging rules. `alternates.canonical` is `/` specifically, not omitted: without it, a
// route that also forgets to set its own canonical (a static-title-only page like `/login`) would
// have none at all rather than inheriting a sensible one.
export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPublicSettings()
    .then((settings) => settings.seo)
    .catch(() => null);

  const title = seo?.siteTitle ?? siteConfig.name;
  const description = seo?.metaDescription ?? siteConfig.description;
  const image = seo?.ogImage || undefined;

  return {
    title: { default: title, template: `%s | ${title}` },
    description,
    metadataBase: new URL(siteConfig.url),
    alternates: { canonical: "/" },
    openGraph: {
      title,
      description,
      url: siteConfig.url,
      siteName: title,
      type: "website",
      locale: siteConfig.locale,
      images: image ? [{ url: image, alt: title }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable, spaceGrotesk.variable)} suppressHydrationWarning>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
