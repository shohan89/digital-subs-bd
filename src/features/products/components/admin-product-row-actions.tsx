"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { deleteProductAction, updateProductAction } from "@/actions/products.actions";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { ROUTES } from "@/constants/routes";
import type { Product } from "@/types/product";

/**
 * No `onProcessed` callback / local list state here (unlike `ReviewRowActions`, which removes a
 * row from a *filtered queue* where a processed item genuinely shouldn't remain) — this is the
 * full, paginated, filterable product list, so `router.refresh()` after a mutation (paired with
 * the actions' own `revalidatePath`) re-fetches the current page from the server instead of
 * risking a client-held copy drifting from what filters/pagination actually match. Same reasoning
 * as `AdminOrderRowActions`/`AdminCategoryRowActions`/`AdminPaymentRowActions`.
 */
export function AdminProductRowActions({ product }: { product: Product }) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isTogglePending, startToggleTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();

  const isActive = product.status === "active";

  function toggleStatus() {
    startToggleTransition(async () => {
      const nextStatus = isActive ? "archived" : "active";
      const result = await updateProductAction({ id: product.id, status: nextStatus });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(isActive ? `${product.name} deactivated` : `${product.name} activated`);
      router.refresh();
    });
  }

  function confirmDelete() {
    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await deleteProductAction(product.id);
      if (!result.success) {
        setDeleteError(result.error);
        return;
      }
      setDeleteOpen(false);
      toast.success(`${product.name} deleted`);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button asChild variant="ghost" size="sm">
        <Link href={ROUTES.adminProductEdit(product.id)}>
          <Pencil aria-hidden="true" />
          Edit
        </Link>
      </Button>

      <Button variant="outline" size="sm" onClick={toggleStatus} disabled={isTogglePending} aria-busy={isTogglePending}>
        {isTogglePending && <LoadingSpinner size="sm" className="text-current" />}
        {isActive ? "Deactivate" : "Activate"}
      </Button>

      <Modal
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setDeleteError(null);
        }}
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label={`Delete ${product.name}`}>
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        }
        title={`Delete "${product.name}"?`}
        description="This permanently removes the product and can't be undone. Products with existing orders or subscriptions can't be deleted — deactivate those instead."
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={isDeletePending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeletePending} aria-busy={isDeletePending}>
              {isDeletePending && <LoadingSpinner size="sm" className="text-current" />}
              Delete product
            </Button>
          </>
        }
      >
        {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
      </Modal>
    </div>
  );
}
