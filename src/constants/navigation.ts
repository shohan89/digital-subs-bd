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
