"use client";

import { useContext } from "react";

import { CartContext } from "@/components/providers/cart-provider";

/**
 * Client-side cart state — `{ items, addItem, removeItem, updateQuantity, clearCart, itemCount,
 * subtotal }` — backed by `CartProvider` (mounted app-wide in `components/providers`). See
 * `src/types/cart.ts` for why this is `localStorage`-only, not Supabase-backed.
 */
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
