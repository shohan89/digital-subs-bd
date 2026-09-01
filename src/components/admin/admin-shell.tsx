"use client";

import { useEffect, useState, type PropsWithChildren } from "react";

import { AdminBreadcrumbs } from "@/components/admin/admin-breadcrumbs";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/types/user";

const SIDEBAR_COLLAPSED_KEY = "admin-sidebar-collapsed";

/**
 * Owns the two pieces of shell UI state — desktop sidebar collapse (persisted) and mobile drawer
 * open/closed (not persisted, resets per navigation) — and lays out `AdminSidebar`/`AdminHeader`/
 * `AdminMobileNav`/`AdminBreadcrumbs` around `children`. Kept as one client component so the
 * sidebar's width and the content column's offset can never drift out of sync.
 */
export function AdminShell({ user, children }: PropsWithChildren<{ user: UserProfile }>) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored !== null) setCollapsed(stored === "true");
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#admin-main-content"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-2 focus-visible:left-2 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-primary focus-visible:px-3 focus-visible:py-2 focus-visible:text-sm focus-visible:font-medium focus-visible:text-primary-foreground"
      >
        Skip to content
      </a>

      <AdminSidebar role={user.role} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      <AdminMobileNav role={user.role} open={mobileNavOpen} onOpenChange={setMobileNavOpen} />

      <div className={cn("flex min-h-screen flex-col transition-[margin] duration-200", collapsed ? "md:ml-16" : "md:ml-64")}>
        <AdminHeader user={user} onOpenMobileNav={() => setMobileNavOpen(true)} />
        <AdminBreadcrumbs />
        <div id="admin-main-content" className="flex flex-1 flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}
