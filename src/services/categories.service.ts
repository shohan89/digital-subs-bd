import { IMAGE_ALLOWED_TYPES, IMAGE_EXTENSION, IMAGE_MAX_BYTES } from "@/constants/images";
import type { AdminCategoryFilters, CreateCategoryInput, UpdateCategoryInput } from "@/features/categories/schemas";
import type { DbClient } from "@/services/types";
import type { Category } from "@/types/category";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw row shape, DbClient is untyped until database.types.ts is generated (see comment there)
export function mapCategoryRow(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    image: row.image,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Public-facing — `status = 'active'` only, matching `productsService.listProducts`'s own
 * explicit filter. RLS enforces the same restriction for an anonymous/customer session, but a
 * *staff* session browsing the public site would otherwise also match the "staff full access"
 * policy (permissive policies OR together) and see inactive categories mixed into public
 * listings — filtering here keeps this function's result the same regardless of who's calling it,
 * the way a "public" query should behave. */
export async function listCategories(db: DbClient): Promise<Category[]> {
  const { data, error } = await db.from("categories").select("*").eq("status", "active").order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapCategoryRow);
}

export async function getCategoryBySlug(db: DbClient, slug: string): Promise<Category | null> {
  const { data, error } = await db.from("categories").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ? mapCategoryRow(data) : null;
}

/** Admin category list — every status, with search/sort. No pagination (unlike
 * `listProductsForAdmin`) — a subscription marketplace's category count stays small enough that
 * paging one page of results isn't worth the added complexity here. */
export async function listCategoriesForAdmin(db: DbClient, filters: AdminCategoryFilters = {}): Promise<Category[]> {
  let query = db.from("categories").select("*");

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.search) query = query.ilike("name", `%${filters.search}%`);

  switch (filters.sort) {
    case "name_desc":
      query = query.order("name", { ascending: false });
      break;
    case "newest":
      query = query.order("created_at", { ascending: false });
      break;
    case "oldest":
      query = query.order("created_at", { ascending: true });
      break;
    default:
      query = query.order("name", { ascending: true }); // "name_asc" and unset both land here
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapCategoryRow);
}

export async function createCategory(db: DbClient, input: CreateCategoryInput): Promise<Category> {
  const { data, error } = await db
    .from("categories")
    .insert({
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      image: input.image ?? null,
      status: input.status,
    })
    .select()
    .single();
  if (error) throw error;
  return mapCategoryRow(data);
}

export async function updateCategory(db: DbClient, input: UpdateCategoryInput): Promise<Category> {
  const { id, ...rest } = input;

  const { data, error } = await db
    .from("categories")
    .update({
      ...(rest.name !== undefined && { name: rest.name }),
      ...(rest.slug !== undefined && { slug: rest.slug }),
      ...(rest.description !== undefined && { description: rest.description }),
      ...(rest.image !== undefined && { image: rest.image }),
      ...(rest.status !== undefined && { status: rest.status }),
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return mapCategoryRow(data);
}

export async function deleteCategory(db: DbClient, id: string) {
  const { error } = await db.from("categories").delete().eq("id", id);
  if (error) throw error;
}

/** Whether any product still references this category — `products.category_id` is
 * `on delete set null`, not `restrict` (see `products`' migration), so the database itself
 * wouldn't actually block a hard delete here the way it does for a referenced product. This check
 * exists anyway so deleting a category doesn't silently orphan a batch of products to
 * "Uncategorized" — the friendly error steers an admin toward deactivating instead. */
export async function isCategoryReferenced(db: DbClient, id: string): Promise<boolean> {
  const { count, error } = await db.from("products").select("id", { count: "exact", head: true }).eq("category_id", id);
  if (error) throw error;
  return (count ?? 0) > 0;
}

const CATEGORY_IMAGES_BUCKET = "category-images";

/** Uploads to the public `category-images` bucket — see `productsService.uploadProductImage`'s
 * doc comment for the full reasoning (public URL vs. private path, safe-filename generation);
 * identical here, just a different bucket. */
export async function uploadCategoryImage(db: DbClient, file: File): Promise<string> {
  const allowedType = IMAGE_ALLOWED_TYPES.find((type) => type === file.type);
  if (!allowedType) {
    throw new Error("Please upload a JPEG, PNG, or WebP image.");
  }
  if (file.size > IMAGE_MAX_BYTES) {
    throw new Error(`Image is too large — please keep it under ${IMAGE_MAX_BYTES / (1024 * 1024)}MB.`);
  }

  const extension = IMAGE_EXTENSION[allowedType];
  const path = `${crypto.randomUUID()}.${extension}`;

  const { error } = await db.storage.from(CATEGORY_IMAGES_BUCKET).upload(path, file, {
    contentType: allowedType,
    upsert: false,
  });
  if (error) throw error;

  const { data } = db.storage.from(CATEGORY_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
