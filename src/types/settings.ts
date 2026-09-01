/**
 * Every field here is deliberately non-secret, publicly-displayable business data (store name,
 * contact info, payment numbers already shown at checkout, social links, SEO copy) — never an API
 * key or credential. Secrets stay environment variables (`src/lib/env.ts`) / secret storage,
 * never this table. See `settings.service.ts`'s doc comment for the access-control reasoning that
 * backs this up structurally, not just by convention.
 */
export type GeneralSettings = {
  storeName: string;
  storeDescription: string;
  supportEmail: string;
  supportPhone: string;
  /** Raw number (e.g. "8801700000000"), not a `wa.me` URL — see `utils/whatsapp.ts`'s
   * `buildWhatsAppUrl`, which every "Contact Support"/"Buy Now" CTA builds from this. Distinct
   * from `SocialSettings.whatsapp` (a full URL for the footer's social-icon row) — see that
   * field's own doc comment for why they're independently editable. */
  whatsappNumber: string;
};

export type PaymentSettings = {
  bkashNumber: string;
  nagadNumber: string;
  rocketNumber: string;
};

export type DeliverySettings = {
  defaultDeliveryTime: string;
  supportHours: string;
};

export type SeoSettings = {
  siteTitle: string;
  metaDescription: string;
  /** A path or absolute URL to an image, same convention as the old `siteConfig.ogImage`. */
  ogImage: string;
};

export type SocialSettings = {
  facebook: string;
  instagram: string;
  youtube: string;
  /** A full URL (e.g. a WhatsApp Business/Channel link) for the footer's social-icon row —
   * independently editable from `GeneralSettings.whatsappNumber`, which is the raw number every
   * transactional "Contact Support"/"Buy Now" CTA uses. An admin might reasonably want the footer
   * icon to point somewhere different (a channel/catalog) than the direct support chat number. */
  whatsapp: string;
};

export type SiteSettings = {
  general: GeneralSettings;
  payment: PaymentSettings;
  delivery: DeliverySettings;
  seo: SeoSettings;
  social: SocialSettings;
};

export type SettingsSection = keyof SiteSettings;
