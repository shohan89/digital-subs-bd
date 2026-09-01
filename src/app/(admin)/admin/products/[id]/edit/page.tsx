import type { Metadata } from "next";
import { notFound, unstable_rethrow } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProductForm } from "@/features/products/components";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { categoriesService, productsService } from "@/services";
import type { Product } from "@/types/product";

type EditProductPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = { title: "Edit Product" };

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;

  // Guarded like every other admin detail page (`/admin/orders/[id]`, `/admin/subscriptions/[id]`,
  // ...) — a transient fetch failure here used to propagate uncaught up to `(admin)/admin/error.tsx`
  // instead of this page's own inline `Alert`, inconsistent with its siblings.
  let product: Product | null;
  let categories: Awaited<ReturnType<typeof categoriesService.listCategoriesForAdmin>>;
  try {
    const supabase = await createServerSupabaseClient();
    // `getProductById` has no `status = 'active'` filter (unlike `getProductBySlug`) — a draft or
    // archived product must still be editable here. Same reasoning for categories:
    // `listCategoriesForAdmin` (every status), not `listCategories` — a product already assigned to
    // a since-deactivated category must still show that category selected, not silently lose it.
    [product, categories] = await Promise.all([
      productsService.getProductById(supabase, id),
      categoriesService.listCategoriesForAdmin(supabase).catch(() => []),
    ]);
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to load product for editing", error);
    return (
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <Alert variant="destructive">
          <AlertDescription>Couldn&apos;t load this product right now. Please try again shortly.</AlertDescription>
        </Alert>
      </main>
    );
  }

  if (!product) notFound();

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Edit product</h1>
        <p className="mt-1 text-sm text-muted-foreground">{product.name}</p>
      </div>
      <ProductForm categories={categories} product={product} />
    </main>
  );
}
