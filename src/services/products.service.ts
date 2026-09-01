import type { AdminProductFilters, CreateProductInput, ProductFilters, UpdateProductInput } from "@/features/products/schemas";
import type { DbClient } from "@/services/types";
import type { Product, ProductVariant } from "@/types/product";
import { mapCategoryRow } from "@/services/categories.service";
import { IMAGE_ALLOWED_TYPES, IMAGE_EXTENSION, IMAGE_MAX_BYTES } from "@/constants/images";

const PRODUCT_SELECT = "*, category:categories(*), variants:product_variants(*)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw row shape, DbClient is untyped until database.types.ts is generated (see comment there)
function mapVariant(row: any): ProductVariant {
  return {
    id: row.id,
    productId: row.product_id,
    name: row.name,
    price: Number(row.price),
    duration: row.duration,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
function mapProduct(row: any): Product {
  return {
    id: row.id,
    categoryId: row.category_id,
    category: row.category ? mapCategoryRow(row.category) : null,
    slug: row.slug,
    name: row.name,
    description: row.description,
    shortDescription: row.short_description,
    price: Number(row.price),
    comparePrice: row.compare_price !== null ? Number(row.compare_price) : null,
    duration: row.duration,
    image: row.image,
    gallery: row.gallery ?? [],
    features: row.features ?? [],
    status: row.status,
    variants: (row.variants ?? []).map(mapVariant),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type ListProductsOptions = {
  /** Max rows to return. Combine with `offset` for page-based pagination. */
  limit?: number;
  offset?: number;
};

export async function listProducts(
  db: DbClient,
  filters: ProductFilters = {},
  options: ListProductsOptions = {},
): Promise<Product[]> {
  let categoryId: string | undefined;
  if (filters.categorySlug) {
    const { data: category, error: categoryError } = await db
      .from("categories")
      .select("id")
      .eq("slug", filters.categorySlug)
      .maybeSingle();
    if (categoryError) throw categoryError; // a lookup failure must not read as "no such category"
    if (!category) return []; // unknown (but successfully looked-up) category slug — nothing can match
    categoryId = category.id;
  }

  let query = db.from("products").select(PRODUCT_SELECT).eq("status", "active");

  if (categoryId) query = query.eq("category_id", categoryId);
  if (filters.search) query = query.ilike("name", `%${filters.search}%`);
  if (filters.minPrice !== undefined) query = query.gte("price", filters.minPrice);
  if (filters.maxPrice !== undefined) query = query.lte("price", filters.maxPrice);
  if (filters.duration !== undefined) query = query.eq("duration", filters.duration);

  switch (filters.sort) {
    case "price_asc":
      query = query.order("price", { ascending: true });
      break;
    case "price_desc":
      query = query.order("price", { ascending: false });
      break;
    default:
      // "popular" and unset both land here — see the comment on `PRODUCT_SORTS`.
      query = query.order("created_at", { ascending: false });
  }

  if (options.offset !== undefined && options.limit !== undefined) {
    query = query.range(options.offset, options.offset + options.limit - 1);
  } else if (options.limit !== undefined) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapProduct);
}

export async function getProductBySlug(db: DbClient, slug: string): Promise<Product | null> {
  const { data, error } = await db
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  return data ? mapProduct(data) : null;
}

/** For internal/admin lookups by primary key — the public site always resolves products by slug. */
export async function getProductById(db: DbClient, id: string): Promise<Product | null> {
  const { data, error } = await db.from("products").select(PRODUCT_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapProduct(data) : null;
}

/**
 * Bulk price/status lookup by id, `status = 'active'` only — for server-side order-total
 * computation (checkout must never trust a client-submitted price). Silently returns fewer
 * products than requested ids for any id that's missing or inactive; the caller is responsible
 * for treating a short result as "some items are no longer purchasable."
 */
export async function getProductsByIds(db: DbClient, ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const { data, error } = await db.from("products").select(PRODUCT_SELECT).in("id", ids).eq("status", "active");
  if (error) throw error;
  return (data ?? []).map(mapProduct);
}

/** Bulk variant price lookup by id — a cart item added under a specific variant must be priced
 * at that variant's `price`, not the base product's, when re-pricing server-side at checkout. */
export async function getVariantsByIds(db: DbClient, ids: string[]): Promise<ProductVariant[]> {
  if (ids.length === 0) return [];
  const { data, error } = await db.from("product_variants").select("*").in("id", ids);
  if (error) throw error;
  return (data ?? []).map(mapVariant);
}

export async function createProduct(db: DbClient, input: CreateProductInput): Promise<Product> {
  const { variants, categoryId, comparePrice, shortDescription, ...rest } = input;

  const { data: created, error } = await db
    .from("products")
    .insert({
      ...rest,
      category_id: categoryId ?? null,
      compare_price: comparePrice ?? null,
      short_description: shortDescription ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;

  if (variants.length > 0) {
    const { error: variantsError } = await db
      .from("product_variants")
      .insert(variants.map((variant) => ({ ...variant, product_id: created.id })));
    if (variantsError) throw variantsError;
  }

  // `getProductBySlug` filters `status = 'active'` — wrong here, since the schema defaults new
  // products to `status: "draft"`. A real bug once: creating a draft/archived product silently
  // returned `null` from this function despite its `Product` return type. `getProductById` has no
  // such filter.
  return getProductById(db, created.id) as Promise<Product>;
}

export async function updateProduct(db: DbClient, input: UpdateProductInput): Promise<Product> {
  // Variant changes (add/remove/reprice) aren't handled here yet — only scalar product fields.
  const { id, variants, categoryId, comparePrice, shortDescription, ...rest } = input;
  void variants;

  const { data, error } = await db
    .from("products")
    .update({
      ...rest,
      ...(categoryId !== undefined && { category_id: categoryId }),
      ...(comparePrice !== undefined && { compare_price: comparePrice }),
      ...(shortDescription !== undefined && { short_description: shortDescription }),
    })
    .eq("id", id)
    .select(PRODUCT_SELECT)
    .single();
  if (error) throw error;
  return mapProduct(data);
}

export async function deleteProduct(db: DbClient, id: string) {
  const { error } = await db.from("products").delete().eq("id", id);
  if (error) throw error;
}

export type AdminListProductsOptions = {
  /**
   * Max rows to return. Same "fetch one extra" pagination contract as `listProducts`/`ShopResults`
   * — pass `pageSize + 1` and slice/check `hasMore` on the result yourself; this function has no
   * opinion on page size and doesn't run a separate `COUNT(*)`.
   */
  limit?: number;
  offset?: number;
};

/**
 * Admin product list — every status, not just `active` (unlike `listProducts`, which is the
 * public shop's query and hardcodes `status = 'active'`). Filters by category id (the admin
 * toolbar's `Select` posts a category id directly, not a slug) and status, with an admin-specific
 * sort set (`ADMIN_PRODUCT_SORTS`) that includes name/oldest-first, neither of which the shop
 * exposes.
 */
export async function listProductsForAdmin(
  db: DbClient,
  filters: AdminProductFilters = {},
  options: AdminListProductsOptions = {},
): Promise<Product[]> {
  let query = db.from("products").select(PRODUCT_SELECT);

  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.search) query = query.ilike("name", `%${filters.search}%`);

  switch (filters.sort) {
    case "oldest":
      query = query.order("created_at", { ascending: true });
      break;
    case "name_asc":
      query = query.order("name", { ascending: true });
      break;
    case "name_desc":
      query = query.order("name", { ascending: false });
      break;
    case "price_asc":
      query = query.order("price", { ascending: true });
      break;
    case "price_desc":
      query = query.order("price", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false }); // "newest" (also the unset default)
  }

  if (options.offset !== undefined && options.limit !== undefined) {
    query = query.range(options.offset, options.offset + options.limit - 1);
  } else if (options.limit !== undefined) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapProduct);
}

/**
 * Whether any order or subscription still references this product — `order_items.product_id`
 * and `subscriptions.product_id` are both `on delete restrict`, so the database itself would
 * reject a hard delete here regardless; this is the friendly pre-check `deleteProductAction` uses
 * to give a clear message instead of a raw foreign-key-violation error, not the actual guarantee.
 * Two count-only (`head: true`) queries run in parallel — never fetches the referencing rows
 * themselves, since only their existence matters here.
 */
export async function isProductReferenced(db: DbClient, id: string): Promise<boolean> {
  const [{ count: orderItemsCount, error: orderItemsError }, { count: subscriptionsCount, error: subscriptionsError }] =
    await Promise.all([
      db.from("order_items").select("id", { count: "exact", head: true }).eq("product_id", id),
      db.from("subscriptions").select("id", { count: "exact", head: true }).eq("product_id", id),
    ]);
  if (orderItemsError) throw orderItemsError;
  if (subscriptionsError) throw subscriptionsError;
  return (orderItemsCount ?? 0) > 0 || (subscriptionsCount ?? 0) > 0;
}

const PRODUCT_IMAGES_BUCKET = "product-images";

/**
 * Uploads to the public `product-images` bucket (see
 * `supabase/migrations/20260830000300_add_product_images_bucket.sql`) and returns the object's
 * public URL — unlike `paymentsService.uploadPaymentScreenshot` (private bucket, returns a
 * storage *path*), product images are meant to be publicly linkable, so the public URL is what
 * the product form actually stores in `products.image`/`products.gallery`.
 *
 * Type and size are validated here, server-side, against `IMAGE_ALLOWED_TYPES`/
 * `IMAGE_MAX_BYTES` (`constants/images.ts`) — never trust `file.type` from the client alone. The
 * filename is never taken from the uploaded file at all: the extension is looked up from the
 * *validated* MIME type (not parsed from the client-supplied filename, which could carry a
 * path-traversal or double-extension trick) and paired with a fresh UUID, so every object name is
 * both safe and globally unique — no user input reaches the storage path.
 */
export async function uploadProductImage(db: DbClient, file: File): Promise<string> {
  const allowedType = IMAGE_ALLOWED_TYPES.find((type) => type === file.type);
  if (!allowedType) {
    throw new Error("Please upload a JPEG, PNG, or WebP image.");
  }
  if (file.size > IMAGE_MAX_BYTES) {
    throw new Error(`Image is too large — please keep it under ${IMAGE_MAX_BYTES / (1024 * 1024)}MB.`);
  }

  const extension = IMAGE_EXTENSION[allowedType];
  const path = `${crypto.randomUUID()}.${extension}`;

  const { error } = await db.storage.from(PRODUCT_IMAGES_BUCKET).upload(path, file, {
    contentType: allowedType,
    upsert: false,
  });
  if (error) throw error;

  const { data } = db.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
