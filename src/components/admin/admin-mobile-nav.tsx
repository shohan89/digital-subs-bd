"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getVisibleAdminNav, isAdminNavItemActive } from "@/constants/admin-nav";
import { siteConfig } from "@/constants/site";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/user";

type AdminMobileNavProps = {
  role: UserRole;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Drawer counterpart to `AdminSidebar` for viewports below `md:` — triggered from `AdminHeader`'s
 * menu button rather than rendering its own trigger, since the trigger lives in the header. */
export function AdminMobileNav({ role, open, onOpenChange }: AdminMobileNavProps) {
  const pathname = usePathname();
  const navItems = getVisibleAdminNav(role);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
        <SheetHeader className="border-b border-sidebar-border">
          <SheetTitle className="flex items-center gap-2 font-heading text-sidebar-foreground">
            <Sparkles className="size-5 text-primary" aria-hidden="true" />
            {siteConfig.name}
          </SheetTitle>
        </SheetHeader>
        <nav aria-label="Admin" className="flex-1 overflow-y-auto p-2">
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = isAdminNavItemActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => onOpenChange(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <item.icon className="size-4.5 shrink-0" aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
