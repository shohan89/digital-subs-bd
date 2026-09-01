import { AppWindow, Bot, FolderTree, Palette, Tv, type LucideIcon } from "lucide-react";

/**
 * Fallback icon shown by `CategoryCard`/`CategoryBanner` when a category has no `image` set —
 * keyed by slug against the categories this platform launches with; anything else (a category
 * added later with no matching entry) falls back to a generic folder icon rather than crashing.
 * Purely cosmetic — never validated against, unlike `PRODUCT_STATUSES`/`CATEGORY_STATUSES`.
 */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  streaming: Tv,
  design: Palette,
  software: AppWindow,
  "ai-tools": Bot,
};

export function getCategoryIcon(slug: string): LucideIcon {
  return CATEGORY_ICONS[slug] ?? FolderTree;
}

export const CATEGORY_STATUSES = ["active", "inactive"] as const;

export type CategoryStatus = (typeof CATEGORY_STATUSES)[number];

export const CATEGORY_STATUS_LABEL: Record<CategoryStatus, string> = {
  active: "Active",
  inactive: "Inactive",
};

export const CATEGORY_SORTS = ["name_asc", "name_desc", "newest", "oldest"] as const;

export type CategorySort = (typeof CATEGORY_SORTS)[number];

export const CATEGORY_SORT_LABEL: Record<CategorySort, string> = {
  name_asc: "Name: A to Z",
  name_desc: "Name: Z to A",
  newest: "Newest first",
  oldest: "Oldest first",
};
