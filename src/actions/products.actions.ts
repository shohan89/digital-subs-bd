"use server";

import { revalidatePath } from "next/cache";

import { ROUTES } from "@/constants/routes";
import { createProductSchema, updateProductSchema } from "@/features/products/schemas";
import { requireStaff } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { productsService } from "@/services";
import { actionError, actionSuccess, type ActionResult } from "@/types/api";
import type { Product } from "@/types/product";

/** Operational (catalog management) — staff, not admin-only, for every action in this file. */
export async function createProductAction(input: unknown): Promise<ActionResult<Product>> {
  await requireStaff();

  const parsed = createProductSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid input", parsed.error.flatten().fieldErrors);

  const supabase = await createServerSupabaseClient();
  try {
    const product = await productsService.createProduct(supabase, parsed.data);
    revalidatePath(ROUTES.adminProducts);
    revalidatePath(ROUTES.shop);
    return actionSuccess(product);
  } catch (error) {
    // `products_slug_key` — the slug is already taken.
    const code = (error as { code?: string } | null)?.code;
    if (code === "23505") return actionError("This slug is already in use. Try a different one.", { slug: ["Already in use"] });
    return actionError(error instanceof Error ? error.message : "Could not create product");
  }
}

export async function updateProductAction(input: unknown): Promise<ActionResult<Product>> {
  await requireStaff();

  const parsed = updateProductSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid input", parsed.error.flatten().fieldErrors);

  const supabase = await createServerSupabaseClient();
  try {
    const product = await productsService.updateProduct(supabase, parsed.data);
    revalidatePath(ROUTES.adminProducts);
    revalidatePath(ROUTES.shop);
    return actionSuccess(product);
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === "23505") return actionError("This slug is already in use. Try a different one.", { slug: ["Already in use"] });
    return actionError(error instanceof Error ? error.message : "Could not update product");
  }
}

const REFERENCED_PRODUCT_MESSAGE =
  "This product has existing orders or subscriptions and can't be deleted. Archive it instead to hide it from the shop while keeping those records intact.";

/**
 * `order_items.product_id`/`subscriptions.product_id` are both `on delete restrict` — a
 * referenced product can never actually be hard-deleted, by design (see the "Known mismatch"-
 * adjacent notes on those tables). `isProductReferenced` is a friendly pre-check for a clear
 * message; the `23503` catch below is the defensive fallback for the (rare) race where an order
 * is placed between that check and the delete — the database constraint is the real guarantee
 * either way, not this function.
 */
export async function deleteProductAction(productId: string): Promise<ActionResult> {
  await requireStaff();

  const supabase = await createServerSupabaseClient();
  try {
    const referenced = await productsService.isProductReferenced(supabase, productId);
    if (referenced) return actionError(REFERENCED_PRODUCT_MESSAGE);

    await productsService.deleteProduct(supabase, productId);
    revalidatePath(ROUTES.adminProducts);
    revalidatePath(ROUTES.shop);
    return actionSuccess(undefined);
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === "23503") return actionError(REFERENCED_PRODUCT_MESSAGE);
    return actionError(error instanceof Error ? error.message : "Could not delete product");
  }
}

/**
 * Uploads one image to the public `product-images` bucket and returns its public URL — see
 * `productsService.uploadProductImage` for the type/size validation and safe-filename generation.
 * Runs on the caller's own session-scoped client (staff has RLS insert rights on this bucket, see
 * the migration), not service-role — there's no rollback problem here forcing that the way
 * checkout's multi-table write has.
 */
export async function uploadProductImageAction(formData: FormData): Promise<ActionResult<{ url: string }>> {
  await requireStaff();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return actionError("No file provided.");

  const supabase = await createServerSupabaseClient();
  try {
    const url = await productsService.uploadProductImage(supabase, file);
    return actionSuccess({ url });
  } catch (error) {
    return actionError(error instanceof Error ? error.message : "Could not upload image");
  }
}
