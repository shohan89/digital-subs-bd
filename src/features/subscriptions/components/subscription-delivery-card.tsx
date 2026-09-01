"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { updateSubscriptionDeliveryAction } from "@/actions/subscriptions.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import type { SubscriptionDelivery } from "@/types/subscription-delivery";

const TEXTAREA_CLASSNAME =
  "min-h-20 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30";

// A native `<input>`/`<textarea>`'s DOM value is always a string, never `undefined` — this form's
// own schema keeps every field a plain (possibly empty) `z.string()` rather than reusing
// `updateSubscriptionDeliverySchema` (whose fields are `.optional()` for the Server Action's `unknown`
// input), so `zodResolver`'s inferred type matches `FormValues` exactly. Same reasoning as
// `create-subscription-modal.tsx`'s `createSubscriptionFormSchema`.
const deliveryFormSchema = z.object({
  accountEmail: z.string().max(255),
  accountUsername: z.string().max(255),
  accessInstructions: z.string().max(2000),
  profileInfo: z.string().max(500),
});

type FormValues = z.infer<typeof deliveryFormSchema>;

/**
 * Staff view of a subscription's sensitive delivery credentials — full plaintext, not masked
 * (staff is one of the two audiences `subscription_deliveries`' RLS grants read access to; the
 * other is the owning customer via their own `/dashboard/subscriptions`, see
 * `SubscriptionCard`'s delivery section). Only ever mounted on `/admin/subscriptions/[id]`, itself
 * `requireStaff()`-gated.
 */
export function SubscriptionDeliveryCard({ subscriptionId, delivery }: { subscriptionId: string; delivery: SubscriptionDelivery | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(deliveryFormSchema),
    defaultValues: {
      accountEmail: delivery?.accountEmail ?? "",
      accountUsername: delivery?.accountUsername ?? "",
      accessInstructions: delivery?.accessInstructions ?? "",
      profileInfo: delivery?.profileInfo ?? "",
    },
  });

  function onSubmit(values: FormValues) {
    setFormError(null);
    startTransition(async () => {
      const result = await updateSubscriptionDeliveryAction({ subscriptionId, ...values });
      if (!result.success) {
        setFormError(result.error);
        return;
      }
      setOpen(false);
      toast.success("Delivery information saved");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Delivery information</CardTitle>
        <Modal
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) setFormError(null);
          }}
          trigger={
            <Button size="sm" variant="outline">
              <Pencil className="size-3.5" aria-hidden="true" />
              {delivery ? "Edit" : "Add"}
            </Button>
          }
          title="Subscription delivery information"
          description="Sensitive account details — visible to staff and to this subscription's customer only, never on a public page."
          footer={
            <>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button onClick={handleSubmit(onSubmit)} disabled={isPending} aria-busy={isPending}>
                {isPending && <LoadingSpinner size="sm" className="text-current" />}
                Save
              </Button>
            </>
          }
        >
          <form className="contents" onSubmit={handleSubmit(onSubmit)}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="delivery-account-email">Account email</FieldLabel>
                <Input id="delivery-account-email" {...register("accountEmail")} disabled={isPending} placeholder="shared-account@example.com" />
                <FieldError errors={[errors.accountEmail]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="delivery-account-username">Account username</FieldLabel>
                <Input id="delivery-account-username" {...register("accountUsername")} disabled={isPending} />
                <FieldError errors={[errors.accountUsername]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="delivery-profile-info">Profile information</FieldLabel>
                <Input id="delivery-profile-info" {...register("profileInfo")} disabled={isPending} placeholder="e.g. Profile 2, PIN 1234" />
                <FieldError errors={[errors.profileInfo]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="delivery-access-instructions">Access instructions</FieldLabel>
                <textarea
                  id="delivery-access-instructions"
                  {...register("accessInstructions")}
                  disabled={isPending}
                  className={TEXTAREA_CLASSNAME}
                  placeholder="How the customer should log in and use this subscription"
                />
                <FieldError errors={[errors.accessInstructions]} />
              </Field>
            </FieldGroup>
            {formError && <p className="mt-2 text-sm text-destructive">{formError}</p>}
          </form>
        </Modal>
      </CardHeader>
      <CardContent>
        {!delivery || (!delivery.accountEmail && !delivery.accountUsername && !delivery.accessInstructions && !delivery.profileInfo) ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <KeyRound className="size-4" aria-hidden="true" />
            No delivery information on file yet.
          </p>
        ) : (
          <dl className="flex flex-col gap-3 text-sm">
            {delivery.accountEmail && (
              <div>
                <dt className="text-xs text-muted-foreground">Account email</dt>
                <dd className="font-mono">{delivery.accountEmail}</dd>
              </div>
            )}
            {delivery.accountUsername && (
              <div>
                <dt className="text-xs text-muted-foreground">Account username</dt>
                <dd className="font-mono">{delivery.accountUsername}</dd>
              </div>
            )}
            {delivery.profileInfo && (
              <div>
                <dt className="text-xs text-muted-foreground">Profile information</dt>
                <dd>{delivery.profileInfo}</dd>
              </div>
            )}
            {delivery.accessInstructions && (
              <div>
                <dt className="text-xs text-muted-foreground">Access instructions</dt>
                <dd className="whitespace-pre-wrap">{delivery.accessInstructions}</dd>
              </div>
            )}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
