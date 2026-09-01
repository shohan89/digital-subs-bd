import Image from "next/image";

import { Container } from "@/components/shared/container";
import { getCategoryIcon } from "@/constants/categories";
import type { Category } from "@/types/category";

/** The category page's H1 + hero-style banner — same radial-glow treatment as the homepage Hero, scoped to this one section. */
export function CategoryBanner({ category }: { category: Category }) {
  const Icon = getCategoryIcon(category.slug);

  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_60%_at_50%_-10%,color-mix(in_oklch,var(--primary),transparent_82%),transparent)]"
      />

      <Container className="flex flex-col items-center gap-4 py-16 text-center sm:py-20">
        {category.image ? (
          // Always above the fold, and the only image on this page's hero — the LCP candidate for
          // every `/category/[slug]` visit.
          <Image src={category.image} alt="" width={64} height={64} priority className="size-16 rounded-2xl object-cover" />
        ) : (
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="size-8" aria-hidden="true" />
          </div>
        )}

        <h1 className="text-balance font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          {category.name}
        </h1>

        {category.description && (
          <p className="max-w-2xl text-balance text-muted-foreground">{category.description}</p>
        )}
      </Container>
    </section>
  );
}
