"use client";

import { useState, type ReactNode } from "react";

import { Modal } from "@/components/ui/modal";
import { CouponForm } from "@/features/coupons/components/coupon-form";
import type { Coupon } from "@/types/coupon";

type CouponFormDialogProps = {
  /** Present in edit mode, absent when creating. */
  coupon?: Coupon;
  trigger: ReactNode;
};

/** Thin `Modal` wrapper around `CouponForm` — used both for the page's "New coupon" button and
 * each row's "Edit" action, same shape as `CategoryFormDialog`. */
export function CouponFormDialog({ coupon, trigger }: CouponFormDialogProps) {
  const [open, setOpen] = useState(false);
  const isEditMode = !!coupon;

  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title={isEditMode ? `Edit "${coupon.code}"` : "New coupon"}
      description={isEditMode ? undefined : "Add a new discount coupon."}
    >
      <CouponForm coupon={coupon} onSuccess={() => setOpen(false)} />
    </Modal>
  );
}
