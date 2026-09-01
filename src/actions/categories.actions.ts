"use server";

import { revalidatePath } from "next/cache";

import { ROUTES } from "@/constants/routes";
import { createCategorySchema, updateCategorySchema } from "@/features/categories/schemas";
import { requireStaff } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { categoriesService } from "@/services";
import { actionError, actionSuccess, type ActionResult } from "@/types/api";
import type { Category } from "@/types/category";

/** Operational (catalog management) — staff, not admin-only, for every action in this file, same
 * as products. */
export async function createCategoryAction(input: unknown): Promise<ActionResult<Category>> {
  await requireStaff();

  const parsed = createCategorySchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid input", parsed.error.flatten().fieldErrors);

  const supabase = await createServerSupabaseClient();
  try {
    const category = await categoriesService.createCategory(supabase, parsed.data);
    revalidatePath(ROUTES.adminCategories);
    revalidatePath(ROUTES.shop);
    revalidatePath(ROUTES.categories);
    return actionSuccess(category);
  } catch (error) {
    // `categories_slug_key` — the slug is already taken.
    const code = (error as { code?: string } | null)?.code;
    if (code === "23505") return actionError("This slug is already in use. Try a different one.", { slug: ["Already in use"] });
    return actionError(error instanceof Error ? error.message : "Could not create category");
  }
}

export async function updateCategoryAction(input: unknown): Promise<ActionResult<Category>> {
  await requireStaff();

  const parsed = updateCategorySchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid input", parsed.error.flatten().fieldErrors);

  const supabase = await createServerSupabaseClient();
  try {
    const category = await categoriesService.updateCategory(supabase, parsed.data);
    revalidatePath(ROUTES.adminCategories);
    revalidatePath(ROUTES.shop);
    revalidatePath(ROUTES.categories);
    return actionSuccess(category);
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === "23505") return actionError("This slug is already in use. Try a different one.", { slug: ["Already in use"] });
    return actionError(error instanceof Error ? error.message : "Could not update category");
  }
}

const REFERENCED_CATEGORY_MESSAGE =
  "This category still has products assigned to it and can't be deleted. Deactivate it instead to hide it from the shop, or move those products to another category first.";

/**
 * Unlike a referenced product (blocked at the database level by `on delete restrict`),
 * `products.category_id` is `on delete set null` — the database would happily null out every
 * assigned product's category and let the delete through. `isCategoryReferenced` is what actually
 * prevents that here, not a database constraint, since silently orphaning products to
 * "Uncategorized" is exactly the "unsafe deletion" this action needs to refuse.
 */
export async function deleteCategoryAction(categoryId: string): Promise<ActionResult> {
  await requireStaff();

  const supabase = await createServerSupabaseClient();
  try {
    const referenced = await categoriesService.isCategoryReferenced(supabase, categoryId);
    if (referenced) return actionError(REFERENCED_CATEGORY_MESSAGE);

    await categoriesService.deleteCategory(supabase, categoryId);
    revalidatePath(ROUTES.adminCategories);
    revalidatePath(ROUTES.shop);
    revalidatePath(ROUTES.categories);
    return actionSuccess(undefined);
  } catch (error) {
    return actionError(error instanceof Error ? error.message : "Could not delete category");
  }
}

/** Same shape as `uploadProductImageAction` — see its doc comment. Runs on the caller's own
 * session-scoped client (staff has RLS insert rights on the `category-images` bucket). */
export async function uploadCategoryImageAction(formData: FormData): Promise<ActionResult<{ url: string }>> {
  await requireStaff();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return actionError("No file provided.");

  const supabase = await createServerSupabaseClient();
  try {
    const url = await categoriesService.uploadCategoryImage(supabase, file);
    return actionSuccess({ url });
  } catch (error) {
    return actionError(error instanceof Error ? error.message : "Could not upload image");
  }
}
