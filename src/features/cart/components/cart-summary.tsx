"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { useCart } from "@/hooks/use-cart";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/format-currency";

/** Subtotal + "Proceed to Checkout" — see `features/checkout` for the real order-creation flow
 * this hands off to (customer info -> payment method -> transaction proof -> order). */
export function CartSummary({ className }: { className?: string }) {
  const { subtotal } = useCart();

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Subtotal</span>
        <span className="font-medium">{formatCurrency(subtotal)}</span>
      </div>
      <Button asChild size="lg" className="w-full">
        <Link href={ROUTES.checkout}>Proceed to Checkout</Link>
      </Button>
    </div>
  );
}
