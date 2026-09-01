"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { deleteReviewAction, moderateReviewAction } from "@/actions/reviews.actions";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import type { AdminReview } from "@/types/review";

type OpenModal = "approve" | "hide" | "delete" | null;

/** `router.refresh()` on success, not local list-splicing — this is now the full filterable/
 * paginated admin list (search/status/rating), the same shape as `AdminOrderRowActions`/
 * `AdminCouponRowActions`, not the old fixed pending-only queue that used to remove rows locally. */
export function AdminReviewRowActions({ review }: { review: AdminReview }) {
  const router = useRouter();
  const [openModal, setOpenModal] = useState<OpenModal>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function closeModal() {
    setOpenModal(null);
    setError(null);
  }

  function moderate(status: "approved" | "hidden") {
    setError(null);
    startTransition(async () => {
      const result = await moderateReviewAction({ reviewId: review.id, status, expectedStatus: review.status });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setOpenModal(null);
      toast.success(status === "approved" ? "Review approved" : "Review hidden");
      router.refresh();
    });
  }

  function confirmDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteReviewAction(review.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setOpenModal(null);
      toast.success("Review deleted");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      {review.status !== "approved" && (
        <Modal
          open={openModal === "approve"}
          onOpenChange={(open) => (open ? setOpenModal("approve") : closeModal())}
          trigger={
            <Button size="sm" disabled={isPending}>
              Approve
            </Button>
          }
          title="Approve this review?"
          description="It will become visible on the product page and homepage testimonials."
          footer={
            <>
              <Button variant="outline" onClick={() => setOpenModal(null)} disabled={isPending}>
                Cancel
              </Button>
              <Button onClick={() => moderate("approved")} disabled={isPending} aria-busy={isPending}>
                {isPending && <LoadingSpinner size="sm" className="text-current" />}
                Confirm approve
              </Button>
            </>
          }
        >
          {error && <p className="text-sm text-destructive">{error}</p>}
        </Modal>
      )}

      {review.status !== "hidden" && (
        <Modal
          open={openModal === "hide"}
          onOpenChange={(open) => (open ? setOpenModal("hide") : closeModal())}
          trigger={
            <Button size="sm" variant="outline" disabled={isPending}>
              Hide
            </Button>
          }
          title="Hide this review?"
          description="It's removed from the product page and homepage immediately. The customer is notified. This can be undone by approving it again."
          footer={
            <>
              <Button variant="outline" onClick={() => setOpenModal(null)} disabled={isPending}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => moderate("hidden")} disabled={isPending} aria-busy={isPending}>
                {isPending && <LoadingSpinner size="sm" className="text-current" />}
                Confirm hide
              </Button>
            </>
          }
        >
          {error && <p className="text-sm text-destructive">{error}</p>}
        </Modal>
      )}

      <Modal
        open={openModal === "delete"}
        onOpenChange={(open) => (open ? setOpenModal("delete") : closeModal())}
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label="Delete review" disabled={isPending}>
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        }
        title="Delete this review?"
        description="This permanently removes the review and can't be undone."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpenModal(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isPending} aria-busy={isPending}>
              {isPending && <LoadingSpinner size="sm" className="text-current" />}
              Delete review
            </Button>
          </>
        }
      >
        {error && <p className="text-sm text-destructive">{error}</p>}
      </Modal>
    </div>
  );
}
