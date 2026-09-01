import type { Metadata } from "next";

import { Container } from "@/components/shared/container";
import { CartPageContent } from "@/features/cart/components";
import { NOINDEX_ROBOTS } from "@/lib/seo";

// A visitor's own transient cart contents — no unique indexable content, never crawlable.
export const metadata: Metadata = { title: "Your Cart", robots: NOINDEX_ROBOTS };

// The cart only exists client-side (localStorage) — this page is just a thin Server Component
// shell for metadata; CartPageContent (client) reads useCart() for the actual content.
export default function CartPage() {
  return (
    <Container className="flex flex-col gap-6 py-16">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Your Cart</h1>
      <CartPageContent />
    </Container>
  );
}
