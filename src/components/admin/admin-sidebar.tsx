"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getVisibleAdminNav, isAdminNavItemActive } from "@/constants/admin-nav";
import { ROUTES } from "@/constants/routes";
import { siteConfig } from "@/constants/site";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/user";

type AdminSidebarProps = {
  role: UserRole;
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

/** Fixed desktop sidebar (`md:` and up) — hidden on mobile in favor of `AdminMobileNav`'s drawer.
 * Collapse state is lifted to `AdminShell` so the content column's left offset can stay in sync. */
export function AdminSidebar({ role, collapsed, onToggleCollapsed }: AdminSidebarProps) {
  const pathname = usePathname();
  const navItems = getVisibleAdminNav(role);

  return (
    <aside
      id="admin-sidebar"
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border px-4">
        <Link
          href={ROUTES.adminDashboard}
          className={cn("flex min-w-0 items-center gap-2 font-heading text-base font-semibold", collapsed && "justify-center")}
        >
          <Sparkles className="size-5 shrink-0 text-primary" aria-hidden="true" />
          {!collapsed && <span className="truncate">{siteConfig.name}</span>}
        </Link>
      </div>

      <nav aria-label="Admin" className="flex-1 overflow-y-auto p-2">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = isAdminNavItemActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    collapsed && "justify-center px-2",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <item.icon className="size-4.5 shrink-0" aria-hidden="true" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-sidebar-border p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapsed}
          aria-expanded={!collapsed}
          aria-controls="admin-sidebar"
          className={cn("w-full text-sidebar-foreground/70 hover:text-sidebar-accent-foreground", collapsed ? "justify-center px-0" : "justify-start gap-2")}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4.5" aria-hidden="true" />
          ) : (
            <>
              <PanelLeftClose className="size-4.5" aria-hidden="true" />
              Collapse
            </>
          )}
          <span className="sr-only">{collapsed ? "Expand sidebar" : "Collapse sidebar"}</span>
        </Button>
      </div>
    </aside>
  );
}
