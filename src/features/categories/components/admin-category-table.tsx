import Image from "next/image";
import { FolderTree } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CATEGORY_STATUS_BADGE_VARIANT } from "@/constants/status-badges";
import { CATEGORY_STATUS_LABEL } from "@/constants/categories";
import { AdminCategoryRowActions } from "@/features/categories/components/admin-category-row-actions";
import { formatDate } from "@/utils/format-date";
import type { Category } from "@/types/category";

export function AdminCategoryTable({ categories }: { categories: Category[] }) {
  if (categories.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
        No categories match your filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <TableRow key={category.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                    {category.image ? (
                      <Image src={category.image} alt="" width={40} height={40} className="size-full object-cover" />
                    ) : (
                      <FolderTree className="size-4 text-muted-foreground" aria-hidden="true" />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{category.name}</span>
                    <span className="truncate text-xs text-muted-foreground">/{category.slug}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="max-w-xs truncate text-muted-foreground">{category.description ?? "—"}</TableCell>
              <TableCell>
                <Badge variant={CATEGORY_STATUS_BADGE_VARIANT[category.status]}>{CATEGORY_STATUS_LABEL[category.status]}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDate(category.updatedAt)}</TableCell>
              <TableCell>
                <AdminCategoryRowActions category={category} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
