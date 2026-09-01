import type { ProductStatus } from "@/constants/products";
import type { Category } from "@/types/category";

export type { ProductStatus };

export type ProductVariant = {
  id: string;
  productId: string;
  name: string;
  price: number;
  duration: number; // days
};

export type Product = {
  id: string;
  categoryId: string | null;
  category?: Category | null;
  slug: string;
  name: string;
  description: string | null;
  shortDescription: string | null;
  price: number;
  comparePrice: number | null;
  duration: number | null; // days; null = variant-priced only
  image: string | null;
  gallery: string[];
  features: string[];
  status: ProductStatus;
  variants: ProductVariant[];
  createdAt: string;
  updatedAt: string;
};
