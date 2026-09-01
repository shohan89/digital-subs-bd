import Link from "next/link";
import { Globe, MessageCircle, Sparkles } from "lucide-react";

import { Container } from "@/components/shared/container";
import { ROUTES } from "@/constants/routes";
import { siteConfig } from "@/constants/site";
import type { SiteSettings } from "@/types/settings";

type FooterLinkGroup = {
  heading: string;
  links: { label: string; href: string }[];
};

function buildFooterLinks(supportEmail: string): FooterLinkGroup[] {
  return [
    {
      heading: "Product",
      links: [
        { label: "All products", href: ROUTES.shop },
        { label: "Track your order", href: ROUTES.orderTracking },
        { label: "Dashboard", href: ROUTES.dashboard },
      ],
    },
    {
      heading: "Account",
      links: [
        { label: "Sign in", href: ROUTES.login },
        { label: "Create account", href: ROUTES.register },
      ],
    },
    {
      heading: "Company",
      links: [{ label: "Contact support", href: `mailto:${supportEmail}` }],
    },
  ];
}

// lucide-react ships no Facebook/Instagram/YouTube brand marks (confirmed — same gap
// `PaymentMethodsList` already documents for bKash/Nagad/Rocket), so every platform except
// WhatsApp (which has a real chat-bubble icon that isn't trying to be a brand mark) uses the
// generic `Globe` icon, distinguished by its `aria-label` instead of faking a logo. Empty string
// means "admin hasn't set this platform" — filtered out below, not rendered as a dead link.
function buildSocialLinks(social: SiteSettings["social"] | undefined) {
  return [
    { key: "facebook", href: social?.facebook, label: "Facebook", icon: Globe },
    { key: "instagram", href: social?.instagram, label: "Instagram", icon: Globe },
    { key: "youtube", href: social?.youtube, label: "YouTube", icon: Globe },
    { key: "whatsapp", href: social?.whatsapp, label: "WhatsApp", icon: MessageCircle },
  ].filter((item): item is typeof item & { href: string } => !!item.href);
}

/**
 * Marketing footer: brand blurb, link columns, social links, support hours, copyright.
 *
 * `settings` is `null` when `MarketingLayout`'s server-side fetch failed (or, in principle, wasn't
 * provided) — every field below falls back to `siteConfig`'s hardcoded defaults in that case, so a
 * settings outage degrades to the old static footer rather than rendering broken/empty.
 */
export function Footer({ settings }: { settings: SiteSettings | null }) {
  const storeName = settings?.general.storeName ?? siteConfig.name;
  const storeDescription = settings?.general.storeDescription ?? siteConfig.description;
  const supportEmail = settings?.general.supportEmail ?? siteConfig.supportEmail;
  const supportPhone = settings?.general.supportPhone;
  const supportHours = settings?.delivery.supportHours;
  const socialLinks = buildSocialLinks(settings?.social);
  const footerLinks = buildFooterLinks(supportEmail);

  return (
    <footer className="border-t border-border/60 bg-background">
      <Container>
        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <div className="flex flex-col gap-3">
            <Link href={ROUTES.home} className="flex items-center gap-2 font-heading text-lg font-semibold">
              <Sparkles className="size-5 text-primary" aria-hidden="true" />
              {storeName}
            </Link>
            <p className="max-w-xs text-sm text-muted-foreground">{storeDescription}</p>
            {supportPhone && <p className="text-sm text-muted-foreground">Call us: {supportPhone}</p>}
            {supportHours && <p className="text-sm text-muted-foreground">Support hours: {supportHours}</p>}
            {socialLinks.length > 0 && (
              <div className="mt-2 flex items-center gap-3">
                {socialLinks.map(({ key, href, label, icon: Icon }) => (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${storeName} on ${label}`}
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {footerLinks.map((group) => (
            <div key={group.heading} className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold">{group.heading}</h3>
              <ul className="flex flex-col gap-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-border/60 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {storeName}. All rights reserved.
          </p>
          <p>Made for Bangladesh.</p>
        </div>
      </Container>
    </footer>
  );
}
