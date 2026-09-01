"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { updateGeneralSettingsAction } from "@/actions/settings.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { toast } from "@/components/ui/toast";
import { generalSettingsSchema, type GeneralSettingsInput } from "@/features/settings/schemas";
import type { GeneralSettings } from "@/types/settings";

const TEXTAREA_CLASSNAME =
  "min-h-20 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30";

export function GeneralSettingsForm({ settings }: { settings: GeneralSettings }) {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GeneralSettingsInput>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: settings,
  });

  function onSubmit(values: GeneralSettingsInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await updateGeneralSettingsAction(values);
      if (!result.success) {
        setFormError(result.error);
        return;
      }
      toast.success("General settings saved");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>General</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <FieldGroup>
            <Field data-invalid={!!errors.storeName}>
              <FieldLabel htmlFor="settings-store-name">Store name</FieldLabel>
              <Input id="settings-store-name" disabled={isPending} {...register("storeName")} />
              <FieldError errors={errors.storeName ? [errors.storeName] : undefined} />
            </Field>

            <Field data-invalid={!!errors.storeDescription}>
              <FieldLabel htmlFor="settings-store-description">Store description</FieldLabel>
              <textarea
                id="settings-store-description"
                disabled={isPending}
                className={TEXTAREA_CLASSNAME}
                rows={3}
                {...register("storeDescription")}
              />
              <FieldError errors={errors.storeDescription ? [errors.storeDescription] : undefined} />
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field data-invalid={!!errors.supportEmail}>
                <FieldLabel htmlFor="settings-support-email">Support email</FieldLabel>
                <Input id="settings-support-email" type="email" disabled={isPending} {...register("supportEmail")} />
                <FieldError errors={errors.supportEmail ? [errors.supportEmail] : undefined} />
              </Field>

              <Field data-invalid={!!errors.supportPhone}>
                <FieldLabel htmlFor="settings-support-phone">Support phone</FieldLabel>
                <Input id="settings-support-phone" type="tel" placeholder="Optional" disabled={isPending} {...register("supportPhone")} />
                <FieldError errors={errors.supportPhone ? [errors.supportPhone] : undefined} />
              </Field>
            </div>

            <Field data-invalid={!!errors.whatsappNumber}>
              <FieldLabel htmlFor="settings-whatsapp-number">WhatsApp number</FieldLabel>
              <Input id="settings-whatsapp-number" placeholder="8801700000000" disabled={isPending} {...register("whatsappNumber")} />
              <FieldError errors={errors.whatsappNumber ? [errors.whatsappNumber] : undefined} />
            </Field>
          </FieldGroup>

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <div>
            <Button type="submit" disabled={isPending} aria-busy={isPending}>
              {isPending && <LoadingSpinner size="sm" className="text-current" />}
              Save general settings
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
