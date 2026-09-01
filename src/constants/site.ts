export const siteConfig = {
  name: "Digital Subs BD",
  shortName: "DigitalSubsBD",
  description:
    "Bangladesh's premium marketplace for digital subscriptions — Netflix, YouTube Premium, Spotify, Canva Pro, ChatGPT Plus, Claude AI, Adobe Creative Cloud, CapCut Pro, Microsoft 365 and more.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ogImage: "/og.png",
  currency: "BDT",
  locale: "en-BD",
  supportEmail: "support@digitalsubsbd.com",
  links: {
    facebook: "https://facebook.com/digitalsubsbd",
    whatsapp: "https://wa.me/8800000000000",
  },
  /**
   * "Send Money" numbers shown at checkout for manual bKash/Nagad/Rocket verification (see
   * `payments.transaction_id`/`payments.screenshot` — there's no payment gateway integration,
   * the customer pays manually to these numbers and submits proof for an admin to verify).
   * Placeholder numbers — replace with the real merchant/personal numbers before launch.
   */
  payment: {
    bkash: { number: "01700-000000", type: "Personal" },
    nagad: { number: "01700-000000", type: "Personal" },
    rocket: { number: "01700-000000-1", type: "Personal" },
  },
} as const;
