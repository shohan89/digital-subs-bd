import { Suspense } from "react";
import Link from "next/link";
import { Headset, ShieldCheck, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/shared/reveal";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { ROUTES } from "@/constants/routes";
import { siteConfig } from "@/constants/site";
import { getPublicSettings } from "@/lib/settings";

const TRUST_BADGES = [
  { label: "Instant Delivery", icon: Zap },
  { label: "Secure Payment", icon: ShieldCheck },
  { label: "24/7 Support", icon: Headset },
];

/**
 * The configured WhatsApp number (`/admin/settings`' General section), not `siteConfig`'s
 * hardcoded placeholder — its own tiny async Server Component + `Suspense` boundary, rather than
 * making `Hero` itself (and therefore `HomePage`, which renders `Hero` outside any `Suspense`) wait
 * on a data fetch: `HomePage`'s own doc comment establishes that static sections must keep
 * painting immediately, so only this one button — not all of `Hero` — streams in separately. Falls
 * back to `siteConfig`'s placeholder digits on a fetch failure, same as
 * `(marketing)/products/[slug]/page.tsx`'s identical fallback for `ProductPurchasePanel`.
 */
async function HeroContactSupportButton() {
  const whatsappNumber = await getPublicSettings()
    .then((settings) => settings.general.whatsappNumber)
    .catch(() => siteConfig.links.whatsapp.replace(/\D/g, ""));

  return <WhatsAppButton phoneNumber={whatsappNumber} variant="outline" size="lg" label="Contact Support" />;
}

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_60%_at_50%_-10%,color-mix(in_oklch,var(--primary),transparent_82%),transparent),radial-gradient(ellipse_50%_40%_at_85%_10%,color-mix(in_oklch,var(--accent),transparent_90%),transparent)]"
      />

      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-20 text-center sm:px-6 sm:py-28 lg:px-8">
        <Reveal>
          <span className="inline-flex items-center rounded-full border border-border/60 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            Bangladesh&apos;s premium digital marketplace
          </span>
        </Reveal>

        <Reveal delay={0.08}>
          <h1 className="text-balance font-heading text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Premium Digital Subscriptions <span className="text-primary">At Your Fingertips</span>
          </h1>
        </Reveal>

        <Reveal delay={0.16}>
          <p className="text-balance text-base text-muted-foreground sm:text-lg">
            Buy Netflix, AI Tools, Design Software and Premium Digital Services at the best price in
            Bangladesh.
          </p>
        </Reveal>

        <Reveal delay={0.24} className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href={ROUTES.shop}>Browse Products</Link>
          </Button>
          <Suspense fallback={<Button size="lg" variant="outline" disabled aria-hidden="true">Contact Support</Button>}>
            <HeroContactSupportButton />
          </Suspense>
        </Reveal>

        <Reveal delay={0.32} className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          {TRUST_BADGES.map(({ label, icon: Icon }) => (
            <span key={label} className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Icon className="size-4 text-primary" aria-hidden="true" />
              {label}
            </span>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
