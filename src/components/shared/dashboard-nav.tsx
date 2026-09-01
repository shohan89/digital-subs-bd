"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Container } from "@/components/shared/container";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

const DASHBOARD_NAV_LINKS = [
  { label: "Overview", href: ROUTES.dashboard },
  { label: "Orders", href: ROUTES.dashboardOrders },
  { label: "Subscriptions", href: ROUTES.dashboardSubscriptions },
  { label: "Notifications", href: ROUTES.dashboardNotifications },
  { label: "Profile", href: ROUTES.dashboardProfile },
];

/** Simple tab strip for the five `/dashboard/*` pages — not the full sidebar shell that's still
 * [not built](PROJECT_STRUCTURE.md#whats-deliberately-not-built-yet), just enough to move between
 * them without relying on `Navbar`'s "My Account" link (which only ever points at `/dashboard`). */
export function DashboardNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-border/60 bg-background">
      <Container>
        <nav aria-label="Dashboard" className="flex gap-1 overflow-x-auto">
          {DASHBOARD_NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </Container>
    </div>
  );
}
