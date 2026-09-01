"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { updateSeoSettingsAction } from "@/actions/settings.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { toast } from "@/components/ui/toast";
import { seoSettingsSchema, type SeoSettingsInput } from "@/features/settings/schemas";
import type { SeoSettings } from "@/types/settings";

const TEXTAREA_CLASSNAME =
  "min-h-20 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30";

export function SeoSettingsForm({ settings }: { settings: SeoSettings }) {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SeoSettingsInput>({
    resolver: zodResolver(seoSettingsSchema),
    defaultValues: settings,
  });

  function onSubmit(values: SeoSettingsInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await updateSeoSettingsAction(values);
      if (!result.success) {
        setFormError(result.error);
        return;
      }
      toast.success("SEO settings saved");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>SEO</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <FieldGroup>
            <Field data-invalid={!!errors.siteTitle}>
              <FieldLabel htmlFor="settings-site-title">Site title</FieldLabel>
              <Input id="settings-site-title" disabled={isPending} {...register("siteTitle")} />
              <FieldError errors={errors.siteTitle ? [errors.siteTitle] : undefined} />
            </Field>

            <Field data-invalid={!!errors.metaDescription}>
              <FieldLabel htmlFor="settings-meta-description">Meta description</FieldLabel>
              <textarea
                id="settings-meta-description"
                disabled={isPending}
                className={TEXTAREA_CLASSNAME}
                rows={3}
                {...register("metaDescription")}
              />
              <FieldError errors={errors.metaDescription ? [errors.metaDescription] : undefined} />
            </Field>

            <Field data-invalid={!!errors.ogImage}>
              <FieldLabel htmlFor="settings-og-image">OG image</FieldLabel>
              <Input id="settings-og-image" placeholder="/og.png or https://…" disabled={isPending} {...register("ogImage")} />
              <FieldDescription>A site-relative path or a full URL, used when the site is shared on social media.</FieldDescription>
              <FieldError errors={errors.ogImage ? [errors.ogImage] : undefined} />
            </Field>
          </FieldGroup>

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <div>
            <Button type="submit" disabled={isPending} aria-busy={isPending}>
              {isPending && <LoadingSpinner size="sm" className="text-current" />}
              Save SEO settings
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
