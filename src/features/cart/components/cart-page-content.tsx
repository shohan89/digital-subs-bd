"use client";

import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Reveal } from "@/components/shared/reveal";
import { CartLineItem } from "@/features/cart/components/cart-line-item";
import { CartSummary } from "@/features/cart/components/cart-summary";
import { EmptyCart } from "@/features/cart/components/empty-cart";
import { useCart } from "@/hooks/use-cart";

export function CartPageContent() {
  const { items, isLoading, itemCount } = useCart();

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" label="Loading cart" />
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyCart className="py-20" />;
  }

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col divide-y divide-border/60">
        <p className="pb-4 text-sm text-muted-foreground">
          {itemCount} item{itemCount === 1 ? "" : "s"}
        </p>
        {items.map((item, index) => (
          <Reveal key={`${item.productId}-${item.variantId}`} delay={Math.min(index, 8) * 0.05} className="py-4">
            <CartLineItem item={item} />
          </Reveal>
        ))}
      </div>

      <div className="h-fit rounded-xl border border-border/60 p-5 lg:sticky lg:top-20">
        <h2 className="font-heading text-base font-medium">Order summary</h2>
        <CartSummary className="mt-4" />
      </div>
    </div>
  );
}
