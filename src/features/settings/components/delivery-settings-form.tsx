"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { updateDeliverySettingsAction } from "@/actions/settings.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { toast } from "@/components/ui/toast";
import { deliverySettingsSchema, type DeliverySettingsInput } from "@/features/settings/schemas";
import type { DeliverySettings } from "@/types/settings";

export function DeliverySettingsForm({ settings }: { settings: DeliverySettings }) {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DeliverySettingsInput>({
    resolver: zodResolver(deliverySettingsSchema),
    defaultValues: settings,
  });

  function onSubmit(values: DeliverySettingsInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await updateDeliverySettingsAction(values);
      if (!result.success) {
        setFormError(result.error);
        return;
      }
      toast.success("Delivery settings saved");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <FieldGroup>
            <Field data-invalid={!!errors.defaultDeliveryTime}>
              <FieldLabel htmlFor="settings-delivery-time">Default delivery time</FieldLabel>
              <Input id="settings-delivery-time" disabled={isPending} {...register("defaultDeliveryTime")} />
              <FieldError errors={errors.defaultDeliveryTime ? [errors.defaultDeliveryTime] : undefined} />
            </Field>

            <Field data-invalid={!!errors.supportHours}>
              <FieldLabel htmlFor="settings-support-hours">Support hours</FieldLabel>
              <Input id="settings-support-hours" disabled={isPending} {...register("supportHours")} />
              <FieldError errors={errors.supportHours ? [errors.supportHours] : undefined} />
            </Field>
          </FieldGroup>

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <div>
            <Button type="submit" disabled={isPending} aria-busy={isPending}>
              {isPending && <LoadingSpinner size="sm" className="text-current" />}
              Save delivery settings
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
