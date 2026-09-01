"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { deleteCategoryAction, updateCategoryAction } from "@/actions/categories.actions";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { CategoryFormDialog } from "@/features/categories/components/category-form-dialog";
import type { Category } from "@/types/category";

/** `router.refresh()` after a mutation, not a local list copy — same reasoning as
 * `AdminProductRowActions`: this is the full list (search/status/sort included), so re-fetching
 * from the server (the action's own `revalidatePath` already invalidated the cache) is simpler
 * and more correct than a client-held copy that could drift from the current filters. */
export function AdminCategoryRowActions({ category }: { category: Category }) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isTogglePending, startToggleTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();

  const isActive = category.status === "active";

  function toggleStatus() {
    startToggleTransition(async () => {
      const nextStatus = isActive ? "inactive" : "active";
      const result = await updateCategoryAction({ id: category.id, status: nextStatus });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(isActive ? `${category.name} deactivated` : `${category.name} activated`);
      router.refresh();
    });
  }

  function confirmDelete() {
    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await deleteCategoryAction(category.id);
      if (!result.success) {
        setDeleteError(result.error);
        return;
      }
      setDeleteOpen(false);
      toast.success(`${category.name} deleted`);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <CategoryFormDialog
        category={category}
        trigger={
          <Button variant="ghost" size="sm">
            <Pencil aria-hidden="true" />
            Edit
          </Button>
        }
      />

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
          <Button variant="ghost" size="icon-sm" aria-label={`Delete ${category.name}`}>
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        }
        title={`Delete "${category.name}"?`}
        description="This permanently removes the category and can't be undone. Categories with products assigned to them can't be deleted — deactivate instead."
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={isDeletePending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeletePending} aria-busy={isDeletePending}>
              {isDeletePending && <LoadingSpinner size="sm" className="text-current" />}
              Delete category
            </Button>
          </>
        }
      >
        {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
      </Modal>
    </div>
  );
}
