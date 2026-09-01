"use client";

import { useState } from "react";
import { ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { PriceDisplay } from "@/features/products/components/price-display";
import { useCart } from "@/hooks/use-cart";
import { cn } from "@/lib/utils";
import { buildWhatsAppUrl } from "@/utils/whatsapp";
import type { Product } from "@/types/product";

/**
 * Variant selection + price display + the two purchase actions, together — selecting a variant
 * changes the price *and* what "Add to Cart"/"Buy Now" actually add/order, so this stays one
 * component rather than three siblings coordinated through prop-drilling.
 *
 * `whatsappNumber` comes from `/admin/settings`' General section, fetched by the product page and
 * passed down — this client component has no data access of its own.
 */
export function ProductPurchasePanel({ product, whatsappNumber }: { product: Product; whatsappNumber: string }) {
  const hasVariants = product.variants.length > 0;
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    hasVariants ? product.variants[0].id : null,
  );
  const { addItem } = useCart();

  const selectedVariant = product.variants.find((variant) => variant.id === selectedVariantId);
  const price = selectedVariant?.price ?? product.price;
  const duration = selectedVariant?.duration ?? product.duration;
  // `product_variants` has no `compare_price` column — a strikethrough price only makes sense
  // for the base product's own pricing, not a variant's flat price.
  const comparePrice = hasVariants ? null : product.comparePrice;

  function handleAddToCart() {
    addItem({
      productId: product.id,
      variantId: selectedVariant?.id ?? null,
      variantName: selectedVariant?.name ?? null,
      slug: product.slug,
      name: product.name,
      price,
      image: product.image,
    });
    toast.success(`${product.name} added to cart`);
  }

  function handleBuyNow() {
    const message = `Hi, I'd like to order ${product.name}${selectedVariant ? ` (${selectedVariant.name})` : ""}`;
    window.open(buildWhatsAppUrl(whatsappNumber, message), "_blank", "noreferrer");
  }

  return (
    <div className="flex flex-col gap-4">
      {hasVariants && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Duration</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Select duration">
            {product.variants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                role="radio"
                aria-checked={variant.id === selectedVariantId}
                onClick={() => setSelectedVariantId(variant.id)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  variant.id === selectedVariantId
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-input text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                )}
              >
                {variant.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <PriceDisplay price={price} comparePrice={comparePrice} duration={duration} size="lg" />

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button size="lg" className="flex-1" onClick={handleBuyNow}>
          Buy Now
        </Button>
        <Button size="lg" variant="outline" className="flex-1" onClick={handleAddToCart}>
          <ShoppingCart aria-hidden="true" />
          Add to Cart
        </Button>
      </div>
    </div>
  );
}
