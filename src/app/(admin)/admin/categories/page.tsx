import type { Metadata } from "next";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { AdminCategoryTable, AdminCategoryToolbar } from "@/features/categories/components";
import { adminCategoryFiltersSchema } from "@/features/categories/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { categoriesService } from "@/services";

export const metadata: Metadata = { title: "Categories" };

type AdminCategoriesSearchParams = {
  search?: string;
  status?: string;
  sort?: string;
};

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<AdminCategoriesSearchParams>;
}) {
  const params = await searchParams;

  const parsedFilters = adminCategoryFiltersSchema.safeParse({
    search: params.search || undefined,
    status: params.status || undefined,
    sort: params.sort || undefined,
  });
  const filters = parsedFilters.success ? parsedFilters.data : {};

  const supabase = await createServerSupabaseClient();

  let categories: Awaited<ReturnType<typeof categoriesService.listCategoriesForAdmin>> = [];
  let loadError = false;
  try {
    categories = await categoriesService.listCategoriesForAdmin(supabase, filters);
  } catch {
    loadError = true;
  }

  return (
    <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-xl font-semibold">Categories</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage the shop&apos;s product categories.</p>
      </div>

      <AdminCategoryToolbar values={{ search: params.search, status: params.status, sort: params.sort }} />

      {loadError ? (
        <Alert variant="destructive">
          <AlertDescription>Couldn&apos;t load categories right now. Please try again shortly.</AlertDescription>
        </Alert>
      ) : (
        <AdminCategoryTable categories={categories} />
      )}
    </main>
  );
}
