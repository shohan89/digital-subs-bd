import { ROUTES } from "@/constants/routes";

export type NavItem = {
  label: string;
  href: string;
};

export const MARKETING_NAV: NavItem[] = [
  { label: "Home", href: ROUTES.home },
  { label: "Shop", href: ROUTES.shop },
  { label: "Categories", href: ROUTES.categories },
];

export const DASHBOARD_NAV: NavItem[] = [
  { label: "Overview", href: ROUTES.dashboard },
  { label: "Orders", href: ROUTES.dashboardOrders },
  { label: "Subscriptions", href: ROUTES.dashboardSubscriptions },
  { label: "Settings", href: ROUTES.dashboardSettings },
];

export const ADMIN_NAV: NavItem[] = [
  { label: "Overview", href: ROUTES.adminDashboard },
  { label: "Products", href: ROUTES.adminProducts },
  { label: "Orders", href: ROUTES.adminOrders },
  { label: "Customers", href: ROUTES.adminCustomers },
  { label: "Subscriptions", href: ROUTES.adminSubscriptions },
];
