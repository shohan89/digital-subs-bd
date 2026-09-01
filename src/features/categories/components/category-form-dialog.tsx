"use client";

import { useState, type ReactNode } from "react";

import { Modal } from "@/components/ui/modal";
import { CategoryForm } from "@/features/categories/components/category-form";
import type { Category } from "@/types/category";

type CategoryFormDialogProps = {
  /** Present in edit mode, absent when creating. */
  category?: Category;
  trigger: ReactNode;
};

/** Thin `Modal` wrapper around `CategoryForm` — used both for the page's "New category" button
 * and each row's "Edit" action, so the dialog-open/close plumbing lives in one place. */
export function CategoryFormDialog({ category, trigger }: CategoryFormDialogProps) {
  const [open, setOpen] = useState(false);
  const isEditMode = !!category;

  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title={isEditMode ? `Edit "${category.name}"` : "New category"}
      description={isEditMode ? undefined : "Add a new category to the catalogue."}
    >
      <CategoryForm category={category} onSuccess={() => setOpen(false)} />
    </Modal>
  );
}
