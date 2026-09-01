import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { JsonLd } from "@/components/shared/json-ld";
import { buildBreadcrumbJsonLd, type BreadcrumbItem } from "@/lib/json-ld";
import { cn } from "@/lib/utils";

/**
 * Renders both the visible breadcrumb trail and its `BreadcrumbList` JSON-LD from the same `items`
 * array — see `buildBreadcrumbJsonLd`'s doc comment for why they're never built separately. The
 * last item renders as plain text (the current page), not a link, same convention as every other
 * breadcrumb UI; every item before it links to `item.path`.
 */
export function Breadcrumbs({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  if (items.length === 0) return null;

  return (
    <>
      <JsonLd data={buildBreadcrumbJsonLd(items)} />
      <nav aria-label="Breadcrumb" className={cn("flex items-center gap-1.5 text-sm text-muted-foreground", className)}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <span key={item.path} className="flex items-center gap-1.5">
              {index > 0 && <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />}
              {isLast ? (
                <span aria-current="page" className="font-medium text-foreground">
                  {item.name}
                </span>
              ) : (
                <Link href={item.path} className="transition-colors hover:text-foreground">
                  {item.name}
                </Link>
              )}
            </span>
          );
        })}
      </nav>
    </>
  );
}
