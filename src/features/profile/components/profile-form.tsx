"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";

import { updateProfileAction } from "@/actions/profile.actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { toast } from "@/components/ui/toast";
import { updateProfileSchema, type UpdateProfileInput } from "@/features/profile/schemas";
import type { UserProfile } from "@/types/user";

export function ProfileForm({ user }: { user: UserProfile }) {
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { fullName: user.fullName ?? "", phone: user.phone ?? "" },
  });

  function onSubmit(values: UpdateProfileInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await updateProfileAction(values);
      if (!result.success) {
        setFormError(result.error);
        return;
      }
      toast.success("Profile updated");
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex max-w-md flex-col gap-5">
      {formError && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="profile-email">Email</FieldLabel>
          <Input id="profile-email" value={user.email} disabled readOnly />
          <FieldDescription>Your login email can&apos;t be changed here.</FieldDescription>
        </Field>

        <Field data-invalid={!!errors.fullName}>
          <FieldLabel htmlFor="profile-full-name">Full name</FieldLabel>
          <Input
            id="profile-full-name"
            autoComplete="name"
            aria-invalid={!!errors.fullName}
            disabled={isPending}
            {...register("fullName")}
          />
          <FieldError errors={errors.fullName ? [errors.fullName] : undefined} />
        </Field>

        <Field data-invalid={!!errors.phone}>
          <FieldLabel htmlFor="profile-phone">Phone</FieldLabel>
          <Input
            id="profile-phone"
            type="tel"
            autoComplete="tel"
            placeholder="01XXXXXXXXX"
            aria-invalid={!!errors.phone}
            disabled={isPending}
            {...register("phone")}
          />
          <FieldError errors={errors.phone ? [errors.phone] : undefined} />
        </Field>
      </FieldGroup>

      <Button type="submit" disabled={isPending} aria-busy={isPending} className="w-fit">
        {isPending && <LoadingSpinner size="sm" className="text-current" />}
        Save changes
      </Button>
    </form>
  );
}
