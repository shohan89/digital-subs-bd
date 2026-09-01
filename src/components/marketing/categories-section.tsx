import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/shared/reveal";
import { SectionTitle } from "@/components/shared/section-title";
import { CategoryCard } from "@/features/categories/components";
import { createStaticSupabaseClient } from "@/lib/supabase/static";
import { categoriesService } from "@/services";
import type { Category } from "@/types/category";

async function getCategories(): Promise<{ categories: Category[]; error: boolean }> {
  try {
    // Cookie-free client, not `createServerSupabaseClient()` — this section renders on the
    // homepage, which now caches (`export const revalidate` in `(marketing)/page.tsx`); a
    // `cookies()`-using fetch anywhere in that page's tree would force it fully dynamic again,
    // the same trap `/category/[slug]`'s own note warns about. Public active-category data only —
    // never swap this back for anything session-scoped.
    const supabase = createStaticSupabaseClient();
    const categories = await categoriesService.listCategories(supabase);
    return { categories, error: false };
  } catch {
    // A DB hiccup here shouldn't take down the rest of the homepage — fail this section only.
    return { categories: [], error: true };
  }
}

export async function CategoriesSection() {
  const { categories, error } = await getCategories();

  if (!error && categories.length === 0) return null;

  return (
    <section id="categories" className="py-16 sm:py-20">
      <Container className="flex flex-col gap-10">
        <SectionTitle
          eyebrow="Browse"
          title="Shop by category"
          description="Find exactly what you're looking for, organized by category."
          align="center"
          className="items-center"
        />

        {error ? (
          <Alert variant="destructive" className="mx-auto max-w-md">
            <AlertTriangle />
            <AlertDescription>Couldn&apos;t load categories right now. Please try again shortly.</AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category, index) => (
              <Reveal key={category.id} delay={index * 0.06}>
                <CategoryCard category={category} />
              </Reveal>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
