"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { createSubscriptionAction } from "@/actions/subscriptions.actions";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { ROUTES } from "@/constants/routes";

// A native `<input>`'s DOM value is always a string, so `orderId` here is `z.union([z.literal(""),
// z.string().uuid()])` (empty string *or* a valid uuid) rather than reusing
// `createSubscriptionSchema.orderId` (`z.string().uuid().optional()`, which rejects `""` outright
// — `undefined` and `""` aren't the same value). Converted to `undefined` on submit instead.
const createSubscriptionFormSchema = z.object({
  customerEmail: z.string().email(),
  productId: z.string().uuid("Select a product"),
  durationDays: z.number().int().min(1).max(3650),
  orderId: z.union([z.literal(""), z.string().uuid("Invalid order ID")]),
});

type FormValues = z.infer<typeof createSubscriptionFormSchema>;

function toRequiredNumber(raw: string): number {
  return raw === "" ? Number.NaN : Number(raw);
}

type CreateSubscriptionModalProps = {
  products: { id: string; name: string }[];
  /** Pre-fills (and locks) the customer email — used from `/admin/customers/[id]`, where the
   * customer is already known, so there's no reason to let it be retyped/mistyped. Omitted on
   * `/admin/subscriptions`, where the admin picks any customer by email. */
  defaultCustomerEmail?: string;
};

/** For manual grants (comp access, migrated customer, ...) — the counterpart to the automatic
 * provisioning `approve_payment()` does on checkout. `customerEmail` is resolved to a user server-
 * side (`find_customer_by_email`), not picked from a browsed list — see
 * `subscriptionsService.createSubscription`'s doc comment for why. */
export function CreateSubscriptionModal({ products, defaultCustomerEmail }: CreateSubscriptionModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createSubscriptionFormSchema),
    defaultValues: { customerEmail: defaultCustomerEmail ?? "", productId: "", durationDays: 30, orderId: "" },
  });

  function onSubmit(values: FormValues) {
    setFormError(null);
    startTransition(async () => {
      const result = await createSubscriptionAction({
        customerEmail: values.customerEmail,
        productId: values.productId,
        durationDays: values.durationDays,
        orderId: values.orderId.trim() || undefined,
      });
      if (!result.success) {
        setFormError(result.error);
        return;
      }
      setOpen(false);
      reset();
      toast.success("Subscription created");
      router.push(ROUTES.adminSubscriptionDetail(result.data.id));
      router.refresh();
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setFormError(null);
      }}
      trigger={
        <Button size="sm">
          <Plus className="size-4" aria-hidden="true" />
          New subscription
        </Button>
      }
      title="Create a subscription"
      description="For manual grants not tied to a checkout payment — comp access, migrated customers, and the like."
      footer={
        <>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isPending} aria-busy={isPending}>
            {isPending && <LoadingSpinner size="sm" className="text-current" />}
            Create
          </Button>
        </>
      }
    >
      <form className="contents" onSubmit={handleSubmit(onSubmit)}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="create-sub-email">Customer email</FieldLabel>
            <Input
              id="create-sub-email"
              type="email"
              {...register("customerEmail")}
              disabled={isPending || !!defaultCustomerEmail}
              placeholder="customer@example.com"
            />
            <FieldError errors={[errors.customerEmail]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="create-sub-product">Product</FieldLabel>
            <Controller
              name="productId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                  <SelectTrigger id="create-sub-product" className="w-full">
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={[errors.productId]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="create-sub-duration">Duration (days)</FieldLabel>
            <Input
              id="create-sub-duration"
              type="number"
              min={1}
              {...register("durationDays", { setValueAs: toRequiredNumber })}
              disabled={isPending}
            />
            <FieldError errors={[errors.durationDays]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="create-sub-order">Order ID (optional)</FieldLabel>
            <Input id="create-sub-order" {...register("orderId")} disabled={isPending} placeholder="Link to an existing order" />
            <FieldError errors={[errors.orderId]} />
          </Field>
        </FieldGroup>
        {formError && <p className="mt-2 text-sm text-destructive">{formError}</p>}
      </form>
    </Modal>
  );
}
