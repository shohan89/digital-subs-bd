import type { CartItem } from "@/types/cart";

const CART_STORAGE_KEY = "digitalsubsbd:cart";

/**
 * Swappable cart persistence layer. `CartProvider` depends only on this interface, not on
 * `localStorage` directly — swapping in a database-backed cart later (once a `cart`/`cart_items`
 * table exists) means writing one adapter that implements `load`/`save` against Supabase instead,
 * and passing it to `<CartProvider storage={supabaseCartAdapter}>` in
 * `components/providers/index.tsx`. No other code (`useCart`, `CartSheet`, the `/cart` page,
 * `ProductPurchasePanel`, ...) needs to change — they all only ever call `useCart()`, never touch
 * storage directly.
 *
 * A real database adapter would additionally need to:
 * - Only apply to signed-in users — `load()`/`save()` have no concept of "guest," so the adapter
 *   itself would need to check `useAuth()`'s `user` (or fall back to this same localStorage
 *   adapter for guests) rather than this interface growing an auth parameter.
 * - `save(items)` here does a full replace on every change, fine for a synchronous local write —
 *   a database adapter should diff and upsert/delete only the changed rows, not replace the whole
 *   cart on every quantity +/- click over the network.
 * - Decide deliberately what happens to a guest's localStorage cart on login (merge into the
 *   database cart? discard? ask?) — not something this interface needs to solve, but easy to get
 *   wrong by accident if it's not a conscious decision when that adapter gets built.
 */
export interface CartStorageAdapter {
  load(): Promise<CartItem[]>;
  save(items: CartItem[]): Promise<void>;
}

export const localStorageCartAdapter: CartStorageAdapter = {
  async load() {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem(CART_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      // Corrupted JSON, storage disabled, private-browsing quota — start with an empty cart.
      return [];
    }
  },

  async save(items) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage disabled/full — the cart still works for this tab, it just won't persist.
    }
  },
};
