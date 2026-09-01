import type { OrderStatus, PaymentStatus } from "@/constants/subscription";

export type OrderItem = {
  id: string;
  orderId: string;
  productId: string;
  /** Snapshot of the product's price at purchase time — not a live join to `products.price`. */
  price: number;
  quantity: number;
  createdAt: string;
  /** Joined from `products` for display (name/slug/image) — live data, not a purchase-time
   * snapshot, since `order_items` has no `product_name`/`image` columns of its own. `null` only
   * if the product row itself is gone, which `products.id`'s `on delete restrict` FK should
   * prevent while any order still references it. */
  product: { name: string; slug: string; image: string | null } | null;
};

export type Order = {
  id: string;
  userId: string;
  /** Fulfillment status — separate from `paymentStatus`. */
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  /** Already net of `discountAmount` — the amount actually charged. */
  totalAmount: number;
  /** Always present (defaults 0) — never derive a discount by re-computing from items elsewhere;
   * this is the authoritative, server-computed value `checkoutService.placeOrder` recorded. */
  discountAmount: number;
  /** Snapshot of the code used, if any — same "snapshot, not live join" reasoning as
   * `customerName`/`customerEmail`; a coupon's own fields can change or the coupon can be deleted
   * later without rewriting this order's history. `null` when no coupon was applied. */
  couponCode: string | null;
  /** Contact snapshot at checkout time — see the migration adding these columns for why this
   * isn't just read off `profiles` (delivery contact can differ, and shouldn't drift if the
   * profile changes later). */
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
};
