"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { updateSocialSettingsAction } from "@/actions/settings.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { toast } from "@/components/ui/toast";
import { socialSettingsSchema, type SocialSettingsInput } from "@/features/settings/schemas";
import type { SocialSettings } from "@/types/settings";

export function SocialSettingsForm({ settings }: { settings: SocialSettings }) {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SocialSettingsInput>({
    resolver: zodResolver(socialSettingsSchema),
    defaultValues: settings,
  });

  function onSubmit(values: SocialSettingsInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await updateSocialSettingsAction(values);
      if (!result.success) {
        setFormError(result.error);
        return;
      }
      toast.success("Social links saved");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Social Links</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <FieldGroup>
            <Field data-invalid={!!errors.facebook}>
              <FieldLabel htmlFor="settings-facebook">Facebook</FieldLabel>
              <Input id="settings-facebook" placeholder="Optional" disabled={isPending} {...register("facebook")} />
              <FieldError errors={errors.facebook ? [errors.facebook] : undefined} />
            </Field>

            <Field data-invalid={!!errors.instagram}>
              <FieldLabel htmlFor="settings-instagram">Instagram</FieldLabel>
              <Input id="settings-instagram" placeholder="Optional" disabled={isPending} {...register("instagram")} />
              <FieldError errors={errors.instagram ? [errors.instagram] : undefined} />
            </Field>

            <Field data-invalid={!!errors.youtube}>
              <FieldLabel htmlFor="settings-youtube">YouTube</FieldLabel>
              <Input id="settings-youtube" placeholder="Optional" disabled={isPending} {...register("youtube")} />
              <FieldError errors={errors.youtube ? [errors.youtube] : undefined} />
            </Field>

            <Field data-invalid={!!errors.whatsapp}>
              <FieldLabel htmlFor="settings-social-whatsapp">WhatsApp</FieldLabel>
              <Input id="settings-social-whatsapp" placeholder="Optional" disabled={isPending} {...register("whatsapp")} />
              <FieldError errors={errors.whatsapp ? [errors.whatsapp] : undefined} />
            </Field>
          </FieldGroup>

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <div>
            <Button type="submit" disabled={isPending} aria-busy={isPending}>
              {isPending && <LoadingSpinner size="sm" className="text-current" />}
              Save social links
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
