import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Product/category images are expected to live in Supabase Storage. `next/image` requires an
    // explicit allowlist for remote hosts — this wildcards any Supabase project's public storage
    // bucket rather than one hardcoded project ref, since the real project isn't connected yet.
    // Add another `remotePatterns` entry here if images ever come from a different host (a CDN,
    // an admin-upload service, etc.) — `next/image` throws for anything not listed.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async redirects() {
    return [
      // The product listing page moved from /products to /shop (richer search/filter/sort UI).
      // /products/[slug] (the detail page) is unaffected — this only covers the bare list route.
      // Next.js forwards the incoming query string automatically, so /products?category=x still
      // lands on /shop?category=x.
      { source: "/products", destination: "/shop", permanent: true },
    ];
  },
  // Baseline hardening headers — none were set before this (found in a production-readiness
  // audit). Deliberately conservative: this app has a login form and a payment-screenshot upload,
  // so clickjacking/MIME-sniffing protection is a real, low-risk win to add. A strict
  // Content-Security-Policy is NOT included here — this app loads images from Supabase Storage
  // and calls the Supabase REST API directly from the browser (the anon-key client), and getting
  // a CSP's source lists wrong is a "silently breaks the site" failure mode,
  // not a "silently insecure" one; it needs its own dedicated pass with real testing against every
  // page, not a guess bundled into an audit already covering sixteen other areas. Runs through
  // Next.js's own header pipeline, verified live against a production build (curl)
  // that these headers actually reach the response.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
