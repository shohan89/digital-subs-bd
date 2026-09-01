"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Package, Plus, X } from "lucide-react";

import { ROUTES } from "@/constants/routes";
import { useCart } from "@/hooks/use-cart";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/format-currency";
import type { CartItem } from "@/types/cart";

type CartLineItemProps = {
  item: CartItem;
  /** Smaller thumbnail for the narrow `CartSheet` drawer — the `/cart` page uses the default size. */
  compact?: boolean;
};

export function CartLineItem({ item, compact = false }: CartLineItemProps) {
  const { removeItem, updateQuantity } = useCart();

  return (
    <div className="flex gap-3">
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted",
          compact ? "size-16" : "size-20",
        )}
      >
        {item.image ? (
          <Image src={item.image} alt="" fill sizes={compact ? "64px" : "80px"} className="object-cover" />
        ) : (
          <Package className="size-6 text-muted-foreground" aria-hidden="true" />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link href={ROUTES.product(item.slug)} className="text-sm font-medium hover:underline">
              {item.name}
            </Link>
            {item.variantName && <p className="text-xs text-muted-foreground">{item.variantName}</p>}
          </div>
          <button
            type="button"
            onClick={() => removeItem(item.productId, item.variantId)}
            aria-label={`Remove ${item.name} from cart`}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
              aria-label="Decrease quantity"
              className="flex size-6 items-center justify-center rounded-md border border-input hover:bg-muted"
            >
              <Minus className="size-3" aria-hidden="true" />
            </button>
            <span className="w-4 text-center text-sm">{item.quantity}</span>
            <button
              type="button"
              onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
              aria-label="Increase quantity"
              className="flex size-6 items-center justify-center rounded-md border border-input hover:bg-muted"
            >
              <Plus className="size-3" aria-hidden="true" />
            </button>
          </div>
          <span className="text-sm font-medium">{formatCurrency(item.price * item.quantity)}</span>
        </div>
      </div>
    </div>
  );
}
