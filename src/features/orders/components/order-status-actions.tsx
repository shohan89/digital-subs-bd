"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateOrderStatusAction } from "@/actions/orders.actions";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/constants/subscription";
import { getValidNextStatuses } from "@/utils/order-status";
import type { Order } from "@/types/order";

/**
 * Renders only the transitions `getValidNextStatuses` actually allows right now — the same
 * function `ordersService.changeOrderStatus` uses to validate the request server-side, so a
 * button never offers a transition the action would reject anyway. "Mark processing" applies
 * immediately (low-stakes, easily corrected by another status change); "Mark completed" and
 * "Cancel order" go through a confirm `Modal` — finalizing fulfillment and cancelling are the two
 * genuinely sensitive actions here.
 */
export function OrderStatusActions({ order }: { order: Order }) {
  const router = useRouter();
  const [openModal, setOpenModal] = useState<"completed" | "cancelled" | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const validNext = getValidNextStatuses(order.status, order.paymentStatus);
  if (validNext.length === 0) return null;

  function apply(status: OrderStatus, note?: string) {
    setError(null);
    startTransition(async () => {
      const result = await updateOrderStatusAction({ orderId: order.id, status, note });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setOpenModal(null);
      setCancelReason("");
      toast.success(`Order marked ${ORDER_STATUS_LABEL[status].toLowerCase()}`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {validNext.includes("processing") && (
        <Button size="sm" variant="outline" onClick={() => apply("processing")} disabled={isPending} aria-busy={isPending}>
          {isPending && <LoadingSpinner size="sm" className="text-current" />}
          Mark processing
        </Button>
      )}

      {validNext.includes("completed") && (
        <Modal
          open={openModal === "completed"}
          onOpenChange={(open) => {
            setOpenModal(open ? "completed" : null);
            if (!open) setError(null);
          }}
          trigger={
            <Button size="sm" disabled={isPending}>
              Mark completed
            </Button>
          }
          title="Mark this order completed?"
          description="This confirms fulfillment is done for this order."
          footer={
            <>
              <Button variant="outline" onClick={() => setOpenModal(null)} disabled={isPending}>
                Cancel
              </Button>
              <Button onClick={() => apply("completed")} disabled={isPending} aria-busy={isPending}>
                {isPending && <LoadingSpinner size="sm" className="text-current" />}
                Confirm
              </Button>
            </>
          }
        >
          {error && <p className="text-sm text-destructive">{error}</p>}
        </Modal>
      )}

      {validNext.includes("cancelled") && (
        <Modal
          open={openModal === "cancelled"}
          onOpenChange={(open) => {
            setOpenModal(open ? "cancelled" : null);
            if (!open) {
              setError(null);
              setCancelReason("");
            }
          }}
          trigger={
            <Button size="sm" variant="destructive" disabled={isPending}>
              Cancel order
            </Button>
          }
          title="Cancel this order?"
          description="This can't be undone."
          footer={
            <>
              <Button variant="outline" onClick={() => setOpenModal(null)} disabled={isPending}>
                Never mind
              </Button>
              <Button
                variant="destructive"
                onClick={() => apply("cancelled", cancelReason.trim() || undefined)}
                disabled={isPending}
                aria-busy={isPending}
              >
                {isPending && <LoadingSpinner size="sm" className="text-current" />}
                Confirm cancel
              </Button>
            </>
          }
        >
          <Field>
            <FieldLabel htmlFor="order-cancel-reason">Reason (optional)</FieldLabel>
            <Input
              id="order-cancel-reason"
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              disabled={isPending}
              placeholder="e.g. Customer requested a refund"
            />
          </Field>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </Modal>
      )}
    </div>
  );
}
