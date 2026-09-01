"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { format } from "date-fns";

import {
  cancelSubscriptionAction,
  extendSubscriptionAction,
  reactivateSubscriptionAction,
  setSubscriptionExpiryAction,
} from "@/actions/subscriptions.actions";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import type { Subscription } from "@/types/subscription";

type OpenModal = "extend" | "expiry" | "cancel" | null;

/**
 * Cancelled subscriptions only offer "Reactivate" (immediate, low-stakes — can be cancelled again
 * if wrong, same reasoning as `OrderStatusActions`' "Mark processing"). Everything else offers
 * Extend/Change expiry/Cancel; extend and change-expiry are confirm-free text-entry modals (the
 * confirmation *is* filling in the field), Cancel gets the same destructive-with-optional-reason
 * modal shape as `OrderStatusActions`' "Cancel order."
 */
export function SubscriptionStatusActions({ subscription }: { subscription: Subscription }) {
  const router = useRouter();
  const [openModal, setOpenModal] = useState<OpenModal>(null);
  const [days, setDays] = useState("30");
  const [expiryDate, setExpiryDate] = useState(() => format(new Date(subscription.expiryDate), "yyyy-MM-dd"));
  const [cancelNote, setCancelNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function closeModal() {
    setOpenModal(null);
    setError(null);
  }

  function handleExtend() {
    const parsedDays = Number(days);
    if (!Number.isInteger(parsedDays) || parsedDays < 1) {
      setError("Enter a whole number of days (1 or more).");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await extendSubscriptionAction({ subscriptionId: subscription.id, days: parsedDays });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setOpenModal(null);
      toast.success(`Extended by ${parsedDays} day${parsedDays === 1 ? "" : "s"}`);
      router.refresh();
    });
  }

  function handleSetExpiry() {
    if (!expiryDate) {
      setError("Pick a date.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await setSubscriptionExpiryAction({ subscriptionId: subscription.id, expiryDate });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setOpenModal(null);
      toast.success("Expiry date updated");
      router.refresh();
    });
  }

  function handleCancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelSubscriptionAction({ subscriptionId: subscription.id, note: cancelNote.trim() || undefined });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setOpenModal(null);
      setCancelNote("");
      toast.success("Subscription cancelled");
      router.refresh();
    });
  }

  function handleReactivate() {
    setError(null);
    startTransition(async () => {
      const result = await reactivateSubscriptionAction({ subscriptionId: subscription.id });
      if (!result.success) {
        setError(result.error);
        return;
      }
      toast.success("Subscription reactivated");
      router.refresh();
    });
  }

  if (subscription.status === "cancelled") {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button size="sm" onClick={handleReactivate} disabled={isPending} aria-busy={isPending}>
          {isPending && <LoadingSpinner size="sm" className="text-current" />}
          Reactivate
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Modal
        open={openModal === "extend"}
        onOpenChange={(open) => (open ? setOpenModal("extend") : closeModal())}
        trigger={
          <Button size="sm" variant="outline" disabled={isPending}>
            Extend
          </Button>
        }
        title="Extend this subscription"
        description="Adds days on top of the current expiry date (or from today, if it's already expired)."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpenModal(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleExtend} disabled={isPending} aria-busy={isPending}>
              {isPending && <LoadingSpinner size="sm" className="text-current" />}
              Extend
            </Button>
          </>
        }
      >
        <Field>
          <FieldLabel htmlFor="extend-days">Days to add</FieldLabel>
          <Input id="extend-days" type="number" min={1} value={days} onChange={(event) => setDays(event.target.value)} disabled={isPending} />
        </Field>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </Modal>

      <Modal
        open={openModal === "expiry"}
        onOpenChange={(open) => (open ? setOpenModal("expiry") : closeModal())}
        trigger={
          <Button size="sm" variant="outline" disabled={isPending}>
            Change expiry
          </Button>
        }
        title="Change expiry date"
        description="Sets an exact new expiry date, replacing the current one."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpenModal(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSetExpiry} disabled={isPending} aria-busy={isPending}>
              {isPending && <LoadingSpinner size="sm" className="text-current" />}
              Save
            </Button>
          </>
        }
      >
        <Field>
          <FieldLabel htmlFor="new-expiry-date">New expiry date</FieldLabel>
          <Input
            id="new-expiry-date"
            type="date"
            value={expiryDate}
            onChange={(event) => setExpiryDate(event.target.value)}
            disabled={isPending}
          />
        </Field>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </Modal>

      <Modal
        open={openModal === "cancel"}
        onOpenChange={(open) => (open ? setOpenModal("cancel") : closeModal())}
        trigger={
          <Button size="sm" variant="destructive" disabled={isPending}>
            Cancel subscription
          </Button>
        }
        title="Cancel this subscription?"
        description="The customer loses access immediately. This can be undone with Reactivate."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpenModal(null)} disabled={isPending}>
              Never mind
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={isPending} aria-busy={isPending}>
              {isPending && <LoadingSpinner size="sm" className="text-current" />}
              Confirm cancel
            </Button>
          </>
        }
      >
        <Field>
          <FieldLabel htmlFor="cancel-note">Reason (optional)</FieldLabel>
          <Input id="cancel-note" value={cancelNote} onChange={(event) => setCancelNote(event.target.value)} disabled={isPending} />
        </Field>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </Modal>
    </div>
  );
}
