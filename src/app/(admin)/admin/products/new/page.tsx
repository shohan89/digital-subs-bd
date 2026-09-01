import type { Metadata } from "next";

import { ProductForm } from "@/features/products/components";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { categoriesService } from "@/services";

export const metadata: Metadata = { title: "New Product" };

export default async function NewProductPage() {
  const supabase = await createServerSupabaseClient();
  // `listCategoriesForAdmin` (every status) — a new product should still be assignable to a
  // deactivated category if a staff member deliberately chooses to (they can activate it later).
  const categories = await categoriesService.listCategoriesForAdmin(supabase).catch(() => []);

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">New product</h1>
        <p className="mt-1 text-sm text-muted-foreground">Add a new subscription to the catalogue.</p>
      </div>
      <ProductForm categories={categories} />
    </main>
  );
}
