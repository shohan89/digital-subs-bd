/**
 * Client-side only — there's no `cart`/`cart_items` table. This persists to `localStorage` via
 * `CartProvider` and never touches Supabase. "Checkout" hands the cart off to a WhatsApp order
 * (see `CartSheet`), the same manual-order pattern the product detail page's "Buy Now" uses —
 * not a real checkout/payment flow.
 */
export type CartItem = {
  productId: string;
  /** `null` when the base product (no variant) was added. */
  variantId: string | null;
  variantName: string | null;
  slug: string;
  name: string;
  price: number;
  image: string | null;
  quantity: number;
};
