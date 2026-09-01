"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, MailCheck } from "lucide-react";
import { useForm } from "react-hook-form";

import { registerAction } from "@/actions/auth.actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { ROUTES } from "@/constants/routes";
import { registerSchema, type RegisterInput } from "@/features/auth/schemas";

export function RegisterForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const [requiresEmailConfirmation, setRequiresEmailConfirmation] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  function onSubmit(values: RegisterInput) {
    setFormError(null);

    const formData = new FormData();
    formData.set("fullName", values.fullName);
    formData.set("email", values.email);
    formData.set("phone", values.phone ?? "");
    formData.set("password", values.password);
    formData.set("confirmPassword", values.confirmPassword);

    startTransition(async () => {
      const result = await registerAction(null, formData);
      if (!result.success) {
        setFormError(result.error);
        for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
          if (messages?.[0]) setError(field as keyof RegisterInput, { message: messages[0] });
        }
        return;
      }
      // Session-having success redirects server-side; only the no-session (email confirmation
      // required) case actually renders anything client-side.
      if (result.data.requiresEmailConfirmation) setRequiresEmailConfirmation(true);
    });
  }

  if (requiresEmailConfirmation) {
    return (
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <MailCheck className="size-10 text-primary" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">
          We&apos;ve sent a confirmation link to your email. Click it to activate your account, then sign in.
        </p>
        <Button asChild className="mt-2 w-full">
          <Link href={ROUTES.login}>Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {formError && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Couldn&apos;t create your account</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <FieldGroup>
        <Field data-invalid={!!errors.fullName}>
          <FieldLabel htmlFor="register-full-name">Full name</FieldLabel>
          <Input
            id="register-full-name"
            autoComplete="name"
            aria-invalid={!!errors.fullName}
            disabled={isPending}
            {...register("fullName")}
          />
          <FieldError errors={errors.fullName ? [errors.fullName] : undefined} />
        </Field>

        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="register-email">Email</FieldLabel>
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            disabled={isPending}
            {...register("email")}
          />
          <FieldError errors={errors.email ? [errors.email] : undefined} />
        </Field>

        <Field data-invalid={!!errors.phone}>
          <FieldLabel htmlFor="register-phone">Phone (optional)</FieldLabel>
          <Input
            id="register-phone"
            type="tel"
            autoComplete="tel"
            placeholder="01XXXXXXXXX"
            aria-invalid={!!errors.phone}
            disabled={isPending}
            {...register("phone")}
          />
          <FieldError errors={errors.phone ? [errors.phone] : undefined} />
        </Field>

        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="register-password">Password</FieldLabel>
          <Input
            id="register-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            disabled={isPending}
            {...register("password")}
          />
          <FieldError errors={errors.password ? [errors.password] : undefined} />
        </Field>

        <Field data-invalid={!!errors.confirmPassword}>
          <FieldLabel htmlFor="register-confirm-password">Confirm password</FieldLabel>
          <Input
            id="register-confirm-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            disabled={isPending}
            {...register("confirmPassword")}
          />
          <FieldError errors={errors.confirmPassword ? [errors.confirmPassword] : undefined} />
        </Field>
      </FieldGroup>

      <Button type="submit" disabled={isPending} aria-busy={isPending} className="w-full">
        {isPending && <LoadingSpinner size="sm" className="text-current" />}
        Create account
      </Button>
    </form>
  );
}
