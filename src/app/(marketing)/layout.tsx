import type { PropsWithChildren } from "react";

import { Footer, FloatingWhatsAppButton, Navbar } from "@/components/shared";
import { getPublicSettings } from "@/lib/settings";

// Public marketing shell (home, product catalogue) — also wraps `/category/[slug]`, the one
// statically-generated page in this app, which is exactly why `getPublicSettings()` (not
// `createServerSupabaseClient()`) is what's safe to call here; see that function's doc comment.
export default async function MarketingLayout({ children }: PropsWithChildren) {
  const settings = await getPublicSettings().catch(() => null);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar storeName={settings?.general.storeName} />
      <main className="flex-1">{children}</main>
      <Footer settings={settings} />
      <FloatingWhatsAppButton phoneNumber={settings?.general.whatsappNumber} />
    </div>
  );
}
