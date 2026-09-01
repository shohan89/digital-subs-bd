"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { approvePaymentAction, getPaymentScreenshotUrlAction, rejectPaymentAction } from "@/actions/payments.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { PAYMENT_RECORD_STATUS_BADGE_VARIANT } from "@/constants/status-badges";
import { PAYMENT_METHOD_LABEL, PAYMENT_RECORD_STATUS_LABEL } from "@/constants/subscription";
import { ScreenshotPreviewDialog } from "@/features/payments/components/screenshot-preview-dialog";
import { formatDate } from "@/utils/format-date";
import type { Payment } from "@/types/payment";

export function OrderPaymentCard({ payment }: { payment: Payment | null }) {
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
    if (!payment) return;
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewUrl(null);
    const result = await getPaymentScreenshotUrlAction(payment.id);
    setPreviewUrl(result.success ? result.data.url : null);
    setPreviewLoading(false);
  }

  function handleApprove() {
    if (!payment) return;
    setError(null);
    startTransition(async () => {
      const result = await approvePaymentAction({ paymentId: payment.id });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setApproveOpen(false);
      toast.success("Payment approved — subscription is now active.");
      router.refresh();
    });
  }

  function handleReject() {
    if (!payment) return;
    setError(null);
    startTransition(async () => {
      const result = await rejectPaymentAction({ paymentId: payment.id, reason: reason.trim() || undefined });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setRejectOpen(false);
      toast.success("Payment rejected.");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment information</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!payment ? (
          <p className="text-sm text-muted-foreground">No payment has been submitted for this order.</p>
        ) : (
          <>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Method</dt>
                <dd className="font-medium">{PAYMENT_METHOD_LABEL[payment.method]}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <Badge variant={PAYMENT_RECORD_STATUS_BADGE_VARIANT[payment.status]}>
                    {PAYMENT_RECORD_STATUS_LABEL[payment.status]}
                  </Badge>
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Transaction ID</dt>
                <dd className="font-mono text-xs font-medium">{payment.transactionId ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Submitted</dt>
                <dd className="font-medium">{formatDate(payment.createdAt)}</dd>
              </div>
            </dl>

            {payment.screenshot && (
              <Button variant="outline" size="sm" className="w-fit" onClick={handleViewScreenshot}>
                View screenshot
              </Button>
            )}

            {payment.status === "pending" && (
              <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
                <Modal
                  open={approveOpen}
                  onOpenChange={(open) => {
                    setApproveOpen(open);
                    if (!open) setError(null);
                  }}
                  trigger={
                    <Button size="sm" disabled={isPending}>
                      Approve payment
                    </Button>
                  }
                  title="Approve this payment?"
                  description="A subscription will be activated for the customer and they'll be notified it's active."
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
                      Reject payment
                    </Button>
                  }
                  title="Reject this payment?"
                  description="The customer will be notified this payment could not be verified."
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
                    <FieldLabel htmlFor="order-reject-reason">Reason (optional)</FieldLabel>
                    <Input
                      id="order-reject-reason"
                      placeholder="e.g. Screenshot doesn't match the transaction ID"
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      disabled={isPending}
                    />
                    <FieldError>{error}</FieldError>
                  </Field>
                </Modal>
              </div>
            )}
          </>
        )}
      </CardContent>

      <ScreenshotPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} url={previewUrl} isLoading={previewLoading} />
    </Card>
  );
}
