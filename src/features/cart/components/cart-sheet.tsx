"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CartLineItem } from "@/features/cart/components/cart-line-item";
import { CartSummary } from "@/features/cart/components/cart-summary";
import { EmptyCart } from "@/features/cart/components/empty-cart";
import { ROUTES } from "@/constants/routes";
import { useCart } from "@/hooks/use-cart";

/** `localStorage`-backed cart (see `src/types/cart.ts`) — "Checkout" in `CartSummary` hands off to the real `/checkout` order-creation flow (see `features/checkout`). */
export function CartSheet() {
  const { items, itemCount } = useCart();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Open cart (${itemCount} items)`}>
          <ShoppingCart className="size-5" aria-hidden="true" />
          {itemCount > 0 && (
            <span className="absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {itemCount > 9 ? "9+" : itemCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Your cart</SheetTitle>
          <SheetDescription>
            {items.length > 0 ? `${itemCount} item${itemCount === 1 ? "" : "s"}` : "Items you add will show up here."}
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <EmptyCart className="flex-1 px-4" />
        ) : (
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
            {items.map((item) => (
              <CartLineItem key={`${item.productId}-${item.variantId}`} item={item} compact />
            ))}
          </div>
        )}

        {items.length > 0 && (
          <SheetFooter>
            <CartSummary />
            <Button asChild variant="ghost" className="w-full">
              <Link href={ROUTES.cart}>View full cart</Link>
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
