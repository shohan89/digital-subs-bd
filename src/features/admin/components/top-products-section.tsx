import Image from "next/image";
import Link from "next/link";
import { Package } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ROUTES } from "@/constants/routes";
import { formatCurrency } from "@/utils/format-currency";
import type { TopProduct } from "@/types/admin";

export function TopProductsSection({ products }: { products: TopProduct[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top products</CardTitle>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href={ROUTES.adminProducts}>View all</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <EmptyState message="No paid orders yet." className="py-6 text-center" />
        ) : (
          <ul className="flex flex-col divide-y divide-border/60">
            {products.map((product, index) => (
              <li key={product.productId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="w-4 shrink-0 text-sm font-medium text-muted-foreground">{index + 1}</span>
                <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                  {product.image ? (
                    <Image src={product.image} alt="" width={36} height={36} className="size-full object-cover" />
                  ) : (
                    <Package className="size-4 text-muted-foreground" aria-hidden="true" />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{product.name}</span>
                  <span className="text-xs text-muted-foreground">{product.totalQuantity} sold</span>
                </div>
                <span className="shrink-0 text-sm font-medium">{formatCurrency(product.totalRevenue)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
