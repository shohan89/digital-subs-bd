import { z } from "zod";

import { ADMIN_PRODUCT_SORTS, PRODUCT_STATUSES } from "@/constants/products";

export const productVariantSchema = z.object({
  name: z.string().min(1, "Variant name is required"),
  price: z.coerce.number().min(0),
  duration: z.coerce.number().int().positive(),
});

export type ProductVariantInput = z.infer<typeof productVariantSchema>;

const baseProductSchema = z.object({
  categoryId: z.string().uuid().optional(),
  name: z.string().min(2, "Name is too short").max(120, "Name is too long"),
  slug: z
    .string()
    .min(2, "Slug is too short")
    .max(120, "Slug is too long")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase, alphanumeric and hyphen-separated"),
  shortDescription: z.string().min(10).max(160).optional(),
  description: z.string().min(20).optional(),
  // Plain `z.number()`, not `z.coerce.number()` — coerce's declared *input* type is `unknown`,
  // which breaks `zodResolver`'s type inference against `useForm<ProductFormValues>` (same issue
  // documented on the review form's `rating` field). `ProductForm` registers these three fields
  // with RHF's `setValueAs` instead, so a real `number` (or `undefined` for an empty optional
  // field) reaches validation directly — no coercion needed here.
  price: z.number({ error: "Price is required" }).min(0, "Price can't be negative"),
  comparePrice: z.number().min(0, "Compare price can't be negative").optional(),
  duration: z.number().int().positive().optional(),
  image: z.string().url().optional(),
  gallery: z.array(z.string().url()).default([]),
  features: z.array(z.string().min(1)).default([]),
  status: z.enum(PRODUCT_STATUSES).default("draft"),
  variants: z.array(productVariantSchema).default([]),
});

// Matches the DB check constraint (`products.compare_price is null or compare_price >= price`) —
// enforced here too so the form/action reject this with a field-level message instead of a raw
// Postgres constraint error surfacing from `createProduct`/`updateProduct`.
function refineComparePrice<T extends z.ZodType<{ price?: number; comparePrice?: number }>>(schema: T) {
  return schema.refine(
    (value) => value.comparePrice === undefined || value.price === undefined || value.comparePrice >= value.price,
    { message: "Compare price must be greater than or equal to the price", path: ["comparePrice"] },
  );
}

export const createProductSchema = refineComparePrice(baseProductSchema);

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = refineComparePrice(
  baseProductSchema.partial().extend({ id: z.string().uuid() }),
);

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

// `ProductForm`'s RHF resolver schema — `variants` omitted since the form has no UI for them
// (see `productsService.updateProduct`'s doc comment: variant changes aren't handled by these
// actions yet). `baseProductSchema.omit(...)` has to happen *before* `refineComparePrice` wraps
// it in `.refine()` — a `ZodEffects` (what `.refine()` returns) doesn't expose `.omit()`, only a
// plain `ZodObject` does.
export const productFormSchema = refineComparePrice(baseProductSchema.omit({ variants: true }));

export type ProductFormValues = z.infer<typeof productFormSchema>;

// "popular" has no real popularity metric behind it (no view/sales-count column) — the service
// treats it as newest-first, same as leaving `sort` unset. See PROJECT_STRUCTURE.md.
export const PRODUCT_SORTS = ["popular", "price_asc", "price_desc"] as const;

export const productFiltersSchema = z.object({
  categorySlug: z.string().optional(),
  search: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  duration: z.coerce.number().int().positive().optional(),
  sort: z.enum(PRODUCT_SORTS).optional(),
});

export type ProductFilters = z.infer<typeof productFiltersSchema>;

// Admin product list filters — a superset of concerns `productFiltersSchema` doesn't have
// (status, since the public shop only ever shows `active`) and a subset it doesn't need
// (price range/duration filtering — not asked for on the admin list). Deliberately separate
// rather than one shared "do everything" schema.
export const adminProductFiltersSchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  sort: z.enum(ADMIN_PRODUCT_SORTS).optional(),
});

export type AdminProductFilters = z.infer<typeof adminProductFiltersSchema>;
