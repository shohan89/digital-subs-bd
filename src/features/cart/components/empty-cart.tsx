import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

export function EmptyCart({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 text-center", className)}>
      <ShoppingCart className="size-10 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">Your cart is empty.</p>
      <Button asChild variant="outline">
        <Link href={ROUTES.shop}>Browse products</Link>
      </Button>
    </div>
  );
}
