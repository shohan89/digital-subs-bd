import Image from "next/image";
import { Package } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { PRODUCT_STATUS_BADGE_VARIANT } from "@/constants/status-badges";
import { PRODUCT_STATUS_LABEL } from "@/constants/products";
import { AdminProductRowActions } from "@/features/products/components/admin-product-row-actions";
import { formatCurrency } from "@/utils/format-currency";
import { formatDate } from "@/utils/format-date";
import type { Product } from "@/types/product";

export function AdminProductTable({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return <EmptyState icon={Package} message="No products match your filters." />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                    {product.image ? (
                      <Image src={product.image} alt="" width={40} height={40} className="size-full object-cover" />
                    ) : (
                      <Package className="size-4 text-muted-foreground" aria-hidden="true" />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{product.name}</span>
                    <span className="truncate text-xs text-muted-foreground">/{product.slug}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{product.category?.name ?? "Uncategorized"}</TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span>{formatCurrency(product.price)}</span>
                  {product.comparePrice !== null && (
                    <span className="text-xs text-muted-foreground line-through">{formatCurrency(product.comparePrice)}</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={PRODUCT_STATUS_BADGE_VARIANT[product.status]}>{PRODUCT_STATUS_LABEL[product.status]}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDate(product.updatedAt)}</TableCell>
              <TableCell>
                <AdminProductRowActions product={product} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
