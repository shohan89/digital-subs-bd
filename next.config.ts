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
};

export default nextConfig;
