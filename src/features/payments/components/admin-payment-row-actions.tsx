"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { approvePaymentAction, getPaymentScreenshotUrlAction, rejectPaymentAction } from "@/actions/payments.actions";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { ScreenshotPreviewDialog } from "@/features/payments/components/screenshot-preview-dialog";
import type { PaymentWithOrder } from "@/types/payment";

/** `router.refresh()` after approve/reject, not a local list copy — this is the full,
 * status-tabbed payment list (see `AdminPaymentToolbar`), so re-fetching from the server (the
 * action's own `revalidatePath` already invalidated the cache) is more correct than a client-held
 * copy that could drift from whichever tab is actually showing. Same reasoning as
 * `AdminOrderRowActions`/`AdminProductRowActions`. */
export function AdminPaymentRowActions({ payment }: { payment: PaymentWithOrder }) {
  const router = useRouter();
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  async function handleViewScreenshot() {
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewUrl(null);
    const result = await getPaymentScreenshotUrlAction(payment.id);
    setPreviewUrl(result.success ? result.data.url : null);
    setPreviewLoading(false);
  }

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const result = await approvePaymentAction({ paymentId: payment.id });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setApproveOpen(false);
      toast.success(`Payment approved — ${payment.order.customerName}'s subscription is now active.`);
      router.refresh();
    });
  }

  function handleReject() {
    setError(null);
    startTransition(async () => {
      const result = await rejectPaymentAction({ paymentId: payment.id, reason: reason.trim() || undefined });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setRejectOpen(false);
      toast.success(`Payment rejected for ${payment.order.customerName}.`);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Button variant="outline" size="sm" onClick={handleViewScreenshot} disabled={!payment.screenshot}>
        View screenshot
      </Button>

      {payment.status === "pending" && (
        <>
          <Modal
            open={approveOpen}
            onOpenChange={(open) => {
              setApproveOpen(open);
              if (!open) setError(null);
            }}
            trigger={
              <Button size="sm" disabled={isPending}>
                Approve
              </Button>
            }
            title="Approve this payment?"
            description={`${payment.order.customerName} will get a subscription activated, and be notified it's active.`}
            footer={
              <>
                <Button variant="outline" onClick={() => setApproveOpen(false)} disabled={isPending}>
                  Cancel
                </Button>
                <Button onClick={handleApprove} disabled={isPending} aria-busy={isPending}>
                  {isPending && <LoadingSpinner size="sm" className="text-current" />}
                  Confirm approve
                </Button>
              </>
            }
          >
            {error && <p className="text-sm text-destructive">{error}</p>}
          </Modal>

          <Modal
            open={rejectOpen}
            onOpenChange={(open) => {
              setRejectOpen(open);
              if (!open) {
                setError(null);
                setReason("");
              }
            }}
            trigger={
              <Button size="sm" variant="destructive" disabled={isPending}>
                Reject
              </Button>
            }
            title="Reject this payment?"
            description={`${payment.order.customerName} will be notified this payment could not be verified.`}
            footer={
              <>
                <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={isPending}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleReject} disabled={isPending} aria-busy={isPending}>
                  {isPending && <LoadingSpinner size="sm" className="text-current" />}
                  Confirm reject
                </Button>
              </>
            }
          >
            <Field>
              <FieldLabel htmlFor={`reject-reason-${payment.id}`}>Reason (optional)</FieldLabel>
              <Input
                id={`reject-reason-${payment.id}`}
                placeholder="e.g. Screenshot doesn't match the transaction ID"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                disabled={isPending}
              />
              <FieldError>{error}</FieldError>
            </Field>
          </Modal>
        </>
      )}

      <ScreenshotPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} url={previewUrl} isLoading={previewLoading} />
    </div>
  );
}
