import Image from "next/image";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { getCategoryIcon } from "@/constants/categories";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/category";

export function CategoryCard({ category, className }: { category: Category; className?: string }) {
  const Icon = getCategoryIcon(category.slug);

  return (
    <Link href={ROUTES.category(category.slug)} className={cn("group block", className)}>
      <Card className="h-full items-center gap-3 p-6 text-center transition-colors group-hover:ring-primary/40">
        {category.image ? (
          <Image src={category.image} alt="" width={56} height={56} className="size-14 rounded-xl object-cover" />
        ) : (
          <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
            <Icon className="size-7" aria-hidden="true" />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <h3 className="font-heading text-base font-medium">{category.name}</h3>
          {category.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">{category.description}</p>
          )}
        </div>
      </Card>
    </Link>
  );
}
