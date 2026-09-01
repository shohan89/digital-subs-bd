"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { updatePaymentSettingsAction } from "@/actions/settings.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { toast } from "@/components/ui/toast";
import { paymentSettingsSchema, type PaymentSettingsInput } from "@/features/settings/schemas";
import type { PaymentSettings } from "@/types/settings";

export function PaymentSettingsForm({ settings }: { settings: PaymentSettings }) {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PaymentSettingsInput>({
    resolver: zodResolver(paymentSettingsSchema),
    defaultValues: settings,
  });

  function onSubmit(values: PaymentSettingsInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await updatePaymentSettingsAction(values);
      if (!result.success) {
        setFormError(result.error);
        return;
      }
      toast.success("Payment settings saved");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <FieldGroup>
            <Field data-invalid={!!errors.bkashNumber}>
              <FieldLabel htmlFor="settings-bkash">bKash number</FieldLabel>
              <Input id="settings-bkash" disabled={isPending} {...register("bkashNumber")} />
              <FieldError errors={errors.bkashNumber ? [errors.bkashNumber] : undefined} />
            </Field>

            <Field data-invalid={!!errors.nagadNumber}>
              <FieldLabel htmlFor="settings-nagad">Nagad number</FieldLabel>
              <Input id="settings-nagad" disabled={isPending} {...register("nagadNumber")} />
              <FieldError errors={errors.nagadNumber ? [errors.nagadNumber] : undefined} />
            </Field>

            <Field data-invalid={!!errors.rocketNumber}>
              <FieldLabel htmlFor="settings-rocket">Rocket number</FieldLabel>
              <Input id="settings-rocket" disabled={isPending} {...register("rocketNumber")} />
              <FieldError errors={errors.rocketNumber ? [errors.rocketNumber] : undefined} />
            </Field>
            <FieldDescription>Shown to customers at checkout for manual &ldquo;Send Money&rdquo; payment verification.</FieldDescription>
          </FieldGroup>

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <div>
            <Button type="submit" disabled={isPending} aria-busy={isPending}>
              {isPending && <LoadingSpinner size="sm" className="text-current" />}
              Save payment settings
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
