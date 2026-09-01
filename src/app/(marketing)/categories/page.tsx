import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { Container } from "@/components/shared/container";
import { SectionTitle } from "@/components/shared/section-title";
import { CategoryCard } from "@/features/categories/components";
import { buildMetadata } from "@/lib/seo";
import { createStaticSupabaseClient } from "@/lib/supabase/static";
import { categoriesService } from "@/services";

export const metadata: Metadata = buildMetadata({
  title: "Categories",
  description: "Browse every category of digital subscription Digital Subs BD sells — streaming, AI tools, design and productivity software, and more.",
  path: "/categories",
});

// Cacheable — public, rarely-changing active-category data, no per-request variance (no
// searchParams, no session). Cookie-free client below is what makes this safe; same convention as
// `/category/[slug]`'s `revalidate = 3600`.
export const revalidate = 3600;

export default async function CategoriesPage() {
  let error = false;
  let categories: Awaited<ReturnType<typeof categoriesService.listCategories>> = [];

  try {
    const supabase = createStaticSupabaseClient();
    categories = await categoriesService.listCategories(supabase);
  } catch {
    error = true;
  }

  return (
    <Container className="flex flex-col gap-10 py-16">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Categories", path: "/categories" }]} />
      <SectionTitle title="All categories" description="Browse our full catalogue by category." />

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertDescription>Couldn&apos;t load categories right now. Please try again shortly.</AlertDescription>
        </Alert>
      ) : categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">No categories yet — check back soon.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      )}
    </Container>
  );
}
