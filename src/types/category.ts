import type { CategoryStatus } from "@/constants/categories";

export type { CategoryStatus };

export type Category = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  description: string | null;
  status: CategoryStatus;
  createdAt: string;
  updatedAt: string;
};
