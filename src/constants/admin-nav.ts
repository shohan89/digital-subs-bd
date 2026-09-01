import {
  CreditCard,
  FolderTree,
  LayoutDashboard,
  Package,
  RefreshCw,
  Settings,
  ShoppingCart,
  Star,
  Ticket,
  Users,
  type LucideIcon,
} from "lucide-react";

import { ROUTES } from "@/constants/routes";
import type { UserRole } from "@/types/user";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Gated by `requireAdmin()`, not `requireStaff()` — see `(admin)/layout.tsx`'s doc comment.
   * Hidden from managers here so the sidebar/mobile nav/search never link a manager to a page
   * that will just bounce them to `/forbidden`. */
  adminOnly?: boolean;
};

/** Single source of truth for admin section links — consumed by `AdminSidebar`, `AdminMobileNav`,
 * `AdminBreadcrumbs` (label lookup), and `AdminSearch`. Order matches the requested sidebar order. */
export const ADMIN_NAV: AdminNavItem[] = [
  { label: "Dashboard", href: ROUTES.adminDashboard, icon: LayoutDashboard },
  { label: "Orders", href: ROUTES.adminOrders, icon: ShoppingCart },
  { label: "Payments", href: ROUTES.adminPayments, icon: CreditCard },
  { label: "Subscriptions", href: ROUTES.adminSubscriptions, icon: RefreshCw },
  { label: "Products", href: ROUTES.adminProducts, icon: Package },
  { label: "Categories", href: ROUTES.adminCategories, icon: FolderTree },
  { label: "Customers", href: ROUTES.adminCustomers, icon: Users, adminOnly: true },
  { label: "Reviews", href: ROUTES.adminReviews, icon: Star },
  { label: "Coupons", href: ROUTES.adminCoupons, icon: Ticket, adminOnly: true },
  { label: "Settings", href: ROUTES.adminSettings, icon: Settings, adminOnly: true },
];

export function getVisibleAdminNav(role: UserRole): AdminNavItem[] {
  return ADMIN_NAV.filter((item) => !item.adminOnly || role === "admin");
}

/** `/admin/products` should also highlight/breadcrumb for `/admin/products/anything`. */
export function isAdminNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
