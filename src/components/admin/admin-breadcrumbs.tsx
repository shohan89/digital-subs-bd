"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { ADMIN_NAV } from "@/constants/admin-nav";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

type Crumb = { label: string; href: string | null };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toTitleCase(value: string): string {
  return value.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

/** A dynamic segment that's a full UUID (an order/product/category id in the URL) renders as the
 * same short id every other page already uses for display (`order.id.slice(0, 8)`, see
 * `AdminOrderTable`/the order detail header) — `toTitleCase`-ing a UUID word-by-word produced
 * nonsense like "67328Ca4 Ba75 432F 94C2 Bfab48F95E48", found while testing the order detail page. */
function labelForSegment(segment: string): string {
  const decoded = decodeURIComponent(segment);
  return UUID_PATTERN.test(decoded) ? decoded.slice(0, 8) : toTitleCase(decoded);
}

/** `/admin/products` -> [Admin, Products]; `/admin/products/anything-later` -> [Admin, Products,
 * "Anything Later"] (generic slug->label fallback, since no per-route label registry exists yet
 * for detail pages that don't exist at this layer). */
function buildCrumbs(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [{ label: "Admin", href: ROUTES.adminDashboard }];
  if (segments.length < 2) return crumbs;

  const sectionHref = `/${segments[0]}/${segments[1]}`;
  const navItem = ADMIN_NAV.find((item) => item.href === sectionHref);
  crumbs.push({ href: sectionHref, label: navItem?.label ?? labelForSegment(segments[1]) });

  for (const segment of segments.slice(2)) {
    crumbs.push({ href: null, label: labelForSegment(segment) });
  }
  return crumbs;
}

export function AdminBreadcrumbs() {
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname);

  return (
    <nav aria-label="Breadcrumb" className="border-b border-border/60 bg-background px-4 py-2.5 sm:px-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 && <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />}
              {crumb.href && !isLast ? (
                <Link href={crumb.href} className="transition-colors hover:text-foreground">
                  {crumb.label}
                </Link>
              ) : (
                <span className={cn(isLast && "font-medium text-foreground")} aria-current={isLast ? "page" : undefined}>
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
