"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { deleteCouponAction, updateCouponAction } from "@/actions/coupons.actions";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { CouponFormDialog } from "@/features/coupons/components/coupon-form-dialog";
import type { Coupon } from "@/types/coupon";

/** `router.refresh()` after a mutation, not a local list copy — same reasoning as
 * `AdminCategoryRowActions`: this is the full filterable list, so re-fetching from the server (the
 * action's own `revalidatePath` already invalidated the cache) is simpler and more correct. */
export function AdminCouponRowActions({ coupon }: { coupon: Coupon }) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isTogglePending, startToggleTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();

  function toggleActive() {
    startToggleTransition(async () => {
      const result = await updateCouponAction({ id: coupon.id, isActive: !coupon.isActive });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(coupon.isActive ? `${coupon.code} deactivated` : `${coupon.code} activated`);
      router.refresh();
    });
  }

  function confirmDelete() {
    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await deleteCouponAction(coupon.id);
      if (!result.success) {
        setDeleteError(result.error);
        return;
      }
      setDeleteOpen(false);
      toast.success(`${coupon.code} deleted`);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <CouponFormDialog
        coupon={coupon}
        trigger={
          <Button variant="ghost" size="sm">
            <Pencil aria-hidden="true" />
            Edit
          </Button>
        }
      />

      <Button variant="outline" size="sm" onClick={toggleActive} disabled={isTogglePending} aria-busy={isTogglePending}>
        {isTogglePending && <LoadingSpinner size="sm" className="text-current" />}
        {coupon.isActive ? "Deactivate" : "Activate"}
      </Button>

      <Modal
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setDeleteError(null);
        }}
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label={`Delete ${coupon.code}`}>
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        }
        title={`Delete "${coupon.code}"?`}
        description="This permanently removes the coupon and can't be undone. Coupons already redeemed on an order can't be deleted — deactivate instead."
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={isDeletePending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeletePending} aria-busy={isDeletePending}>
              {isDeletePending && <LoadingSpinner size="sm" className="text-current" />}
              Delete coupon
            </Button>
          </>
        }
      >
        {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
      </Modal>
    </div>
  );
}
