"use client";

import { createContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import { localStorageCartAdapter, type CartStorageAdapter } from "@/lib/cart/storage";
import type { CartItem } from "@/types/cart";

export type CartContextValue = {
  items: CartItem[];
  /** True until the initial `storage.load()` resolves — lets a page tell "empty" apart from "not loaded yet". */
  isLoading: boolean;
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (productId: string, variantId: string | null) => void;
  updateQuantity: (productId: string, variantId: string | null, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
};

export const CartContext = createContext<CartContextValue | undefined>(undefined);

function sameLine(a: { productId: string; variantId: string | null }, b: { productId: string; variantId: string | null }) {
  return a.productId === b.productId && a.variantId === b.variantId;
}

type CartProviderProps = PropsWithChildren<{
  /** Swappable persistence layer — defaults to `localStorage`. See `src/lib/cart/storage.ts`. */
  storage?: CartStorageAdapter;
}>;

/**
 * See `src/types/cart.ts` for why there's no `cart`/`cart_items` table behind this yet, and
 * `src/lib/cart/storage.ts` for how this is built to swap onto one later. Mounted once in
 * `components/providers/index.tsx`, read via `useCart` (`src/hooks/use-cart.ts`).
 */
export function CartProvider({ children, storage = localStorageCartAdapter }: CartProviderProps) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load once on mount — `storage` is a stable adapter reference passed once at mount, not
  // something that changes while the app is running, so the empty dep array is intentional.
  useEffect(() => {
    let cancelled = false;
    storage.load().then((loaded) => {
      if (cancelled) return;
      setItems(loaded);
      setIsLoading(false);
      setIsHydrated(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `storage` is a stable reference for the provider's lifetime, see comment above
  }, []);

  useEffect(() => {
    if (!isHydrated) return; // don't clobber storage with the initial empty state before the load above resolves
    storage.save(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `storage` is a stable reference for the provider's lifetime
  }, [items, isHydrated]);

  function addItem(input: Omit<CartItem, "quantity"> & { quantity?: number }) {
    const line = { productId: input.productId, variantId: input.variantId };
    const quantity = input.quantity ?? 1;

    setItems((prev) => {
      const existing = prev.find((item) => sameLine(item, line));
      if (existing) {
        return prev.map((item) => (sameLine(item, line) ? { ...item, quantity: item.quantity + quantity } : item));
      }
      return [...prev, { ...input, quantity }];
    });
  }

  function removeItem(productId: string, variantId: string | null) {
    setItems((prev) => prev.filter((item) => !sameLine(item, { productId, variantId })));
  }

  function updateQuantity(productId: string, variantId: string | null, quantity: number) {
    if (quantity <= 0) return removeItem(productId, variantId);
    setItems((prev) =>
      prev.map((item) => (sameLine(item, { productId, variantId }) ? { ...item, quantity } : item)),
    );
  }

  function clearCart() {
    setItems([]);
  }

  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);

  return (
    <CartContext.Provider
      value={{ items, isLoading, addItem, removeItem, updateQuantity, clearCart, itemCount, subtotal }}
    >
      {children}
    </CartContext.Provider>
  );
}
