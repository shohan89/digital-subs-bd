import type { Metadata } from "next";
import type { PropsWithChildren } from "react";

import { NOINDEX_ROBOTS } from "@/lib/seo";

// Applies to /login, /register, /forgot-password at once — low SEO value, no reason to compete
// with the shop/category/product pages for crawl budget or send search traffic here.
export const metadata: Metadata = { robots: NOINDEX_ROBOTS };

// Centered auth shell for login/register/forgot-password.
export default function AuthLayout({ children }: PropsWithChildren) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,color-mix(in_oklch,var(--primary),transparent_85%),transparent)]"
      />
      {children}
    </div>
  );
}
