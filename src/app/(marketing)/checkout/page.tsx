import type { Metadata } from "next";

import { Container } from "@/components/shared/container";
import { CheckoutForm } from "@/features/checkout/components";
import { requireUser } from "@/lib/auth/session";
import { NOINDEX_ROBOTS } from "@/lib/seo";
import { getPublicSettings } from "@/lib/settings";

// Requires a signed-in session either way (see below) — never indexable.
export const metadata: Metadata = { title: "Checkout", robots: NOINDEX_ROBOTS };

// Protected: `middleware.ts`'s `PROTECTED_PREFIXES` covers `/checkout` (bounces an unauthenticated
// request to `/login?redirectTo=/checkout`), and `requireUser()` here is the same defense-in-depth
// double-check `(dashboard)`/`(admin)` layouts already do — `orders.user_id` is `not null` and RLS
// requires `auth.uid()`, so there's no guest-checkout path this schema supports.
export default async function CheckoutPage() {
  const user = await requireUser();
  // Falls back to `getSettings`'s own built-in defaults on a fetch failure (see
  // `settingsService.getSettings`'s doc comment) rather than block checkout entirely — the
  // customer can still see *a* payment number, even if it's not the latest one.
  const { payment: paymentNumbers } = await getPublicSettings().catch(() => ({
    payment: { bkashNumber: "01700-000000", nagadNumber: "01700-000000", rocketNumber: "01700-000000-1" },
  }));

  return (
    <Container className="flex flex-col gap-6 py-16">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Checkout</h1>
      <CheckoutForm user={user} paymentNumbers={paymentNumbers} />
    </Container>
  );
}
