import type { Metadata } from "next";

import { Container } from "@/components/shared/container";
import { siteConfig } from "@/constants/site";
import { OrderTrackingForm } from "@/features/order-tracking/components";
import { NOINDEX_ROBOTS } from "@/lib/seo";
import { getPublicSettings } from "@/lib/settings";

// Public (no login required — see below), but never indexable: an `?orderId=` link is a
// per-visitor lookup of order status, not unique indexable content search engines should surface.
export const metadata: Metadata = { title: "Track Your Order", robots: NOINDEX_ROBOTS };

type OrderTrackingPageProps = {
  searchParams: Promise<{ orderId?: string }>;
};

// Deliberately public — no requireUser() — see `actions/order-tracking.actions.ts`'s doc comment
// for why the order id + phone number pair is the authorization check here, not a session.
export default async function OrderTrackingPage({ searchParams }: OrderTrackingPageProps) {
  const { orderId } = await searchParams;

  // Non-critical — same fallback pattern as every other public page's identical settings fetch.
  const settings = await getPublicSettings().catch(() => null);
  const whatsappNumber = settings?.general.whatsappNumber ?? siteConfig.links.whatsapp.replace(/\D/g, "");
  const storeName = settings?.general.storeName ?? siteConfig.name;

  return (
    <Container className="flex flex-col gap-10 py-16">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-balance font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Track your order
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
          Enter your Order ID and the phone number you used at checkout to see its current status.
        </p>
      </div>
      <div className="mx-auto w-full max-w-2xl">
        <OrderTrackingForm defaultOrderId={orderId} whatsappNumber={whatsappNumber} storeName={storeName} />
      </div>
    </Container>
  );
}
