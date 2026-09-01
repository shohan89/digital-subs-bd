import { z } from "zod";

import { CATEGORY_SORTS, CATEGORY_STATUSES } from "@/constants/categories";

const baseCategorySchema = z.object({
  name: z.string().min(2, "Name is too short").max(80, "Name is too long"),
  slug: z
    .string()
    .min(2, "Slug is too short")
    .max(80, "Slug is too long")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase, alphanumeric and hyphen-separated"),
  description: z.string().min(10, "Description is too short").max(500, "Description is too long").optional(),
  image: z.string().url().optional(),
  status: z.enum(CATEGORY_STATUSES).default("active"),
});

export const createCategorySchema = baseCategorySchema;

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = baseCategorySchema.partial().extend({ id: z.string().uuid() });

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const adminCategoryFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(CATEGORY_STATUSES).optional(),
  sort: z.enum(CATEGORY_SORTS).optional(),
});

export type AdminCategoryFilters = z.infer<typeof adminCategoryFiltersSchema>;
