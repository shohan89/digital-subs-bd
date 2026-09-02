import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ROUTES } from "@/constants/routes";

export function EmptyCart({ className }: { className?: string }) {
  return (
    <EmptyState
      icon={ShoppingCart}
      message="Your cart is empty."
      action={
        <Button asChild variant="outline">
          <Link href={ROUTES.shop}>Browse products</Link>
        </Button>
      }
      className={className}
    />
  );
}
