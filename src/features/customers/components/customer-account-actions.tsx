"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setCustomerDisabledAction } from "@/actions/customers.actions";
import { Button } from "@/components/ui/button";
import { CreateSubscriptionModal } from "@/features/subscriptions/components";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { ROUTES } from "@/constants/routes";
import type { Customer } from "@/types/customer";

type CustomerAccountActionsProps = {
  customer: Customer;
  products: { id: string; name: string }[];
  /** `false` for the caller's own account or an admin-role account — see
   * `setCustomerDisabledAction`'s doc comment for why those can never be disabled. Computed
   * server-side on the page (it already knows the signed-in admin's id), not re-derived here. */
  canDisable: boolean;
};

export function CustomerAccountActions({ customer, products, canDisable }: CustomerAccountActionsProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleEnable() {
    setError(null);
    startTransition(async () => {
      const result = await setCustomerDisabledAction({ customerId: customer.id, disabled: false });
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success("Account enabled");
      router.refresh();
    });
  }

  function handleDisable() {
    setError(null);
    startTransition(async () => {
      const result = await setCustomerDisabledAction({ customerId: customer.id, disabled: true });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setConfirmOpen(false);
      toast.success("Account disabled");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild variant="outline" size="sm">
        <Link href={`${ROUTES.adminOrders}?search=${encodeURIComponent(customer.email)}`}>View orders</Link>
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link href={`${ROUTES.adminSubscriptions}?search=${encodeURIComponent(customer.email)}`}>View subscriptions</Link>
      </Button>
      <CreateSubscriptionModal products={products} defaultCustomerEmail={customer.email} />

      {customer.disabled ? (
        <Button size="sm" onClick={handleEnable} disabled={isPending} aria-busy={isPending}>
          {isPending && <LoadingSpinner size="sm" className="text-current" />}
          Enable account
        </Button>
      ) : (
        canDisable && (
          <Modal
            open={confirmOpen}
            onOpenChange={(open) => {
              setConfirmOpen(open);
              if (!open) setError(null);
            }}
            trigger={
              <Button size="sm" variant="destructive" disabled={isPending}>
                Disable account
              </Button>
            }
            title="Disable this account?"
            description="Blocks future sign-ins and ends this customer's access immediately, even on an already-open session. Can be reversed with Enable account."
            footer={
              <>
                <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isPending}>
                  Never mind
                </Button>
                <Button variant="destructive" onClick={handleDisable} disabled={isPending} aria-busy={isPending}>
                  {isPending && <LoadingSpinner size="sm" className="text-current" />}
                  Confirm disable
                </Button>
              </>
            }
          >
            {error && <p className="text-sm text-destructive">{error}</p>}
          </Modal>
        )
      )}
      {error && !confirmOpen && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
