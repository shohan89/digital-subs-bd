export const PRODUCT_STATUSES = ["draft", "active", "archived"] as const;

export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  draft: "Draft",
  active: "Active",
  archived: "Archived",
};

/**
 * Reference list of providers the platform launches with — not an enum anything validates
 * against. Categories and products themselves are DB-driven (`categories`/`products` tables),
 * not a fixed list; see `src/services/categories.service.ts` / `products.service.ts`.
 */
export const FEATURED_PROVIDERS = [
  "Netflix Premium",
  "YouTube Premium",
  "Spotify Premium",
  "Canva Pro",
  "ChatGPT Plus",
  "Claude AI",
  "Adobe Creative Cloud",
  "CapCut Pro",
  "Microsoft 365",
] as const;

// Admin product list — distinct from the public shop's `PRODUCT_SORTS` (features/products/schemas.ts):
// the shop only ever sorts *active* products for a shopper, this sorts every status for an admin.
export const ADMIN_PRODUCT_SORTS = ["newest", "oldest", "name_asc", "name_desc", "price_asc", "price_desc"] as const;

export type AdminProductSort = (typeof ADMIN_PRODUCT_SORTS)[number];

export const ADMIN_PRODUCT_SORT_LABEL: Record<AdminProductSort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  name_asc: "Name: A to Z",
  name_desc: "Name: Z to A",
  price_asc: "Price: Low to High",
  price_desc: "Price: High to Low",
};

// Image upload validation (allowed types/extensions/max size) moved to `constants/images.ts` —
// it's generic to any admin image upload, not product-specific (categories reuse it too).
