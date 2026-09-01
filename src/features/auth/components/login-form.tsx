"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";

import { loginAction } from "@/actions/auth.actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { ROUTES } from "@/constants/routes";
import { loginSchema, type LoginInput } from "@/features/auth/schemas";

type LoginFormProps = {
  redirectTo?: string;
};

export function LoginForm({ redirectTo }: LoginFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  function onSubmit(values: LoginInput) {
    setFormError(null);

    const formData = new FormData();
    formData.set("email", values.email);
    formData.set("password", values.password);
    if (redirectTo) formData.set("redirectTo", redirectTo);

    startTransition(async () => {
      const result = await loginAction(null, formData);
      if (result.success) return; // loginAction redirects server-side on success

      setFormError(result.error);
      for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
        if (messages?.[0]) setError(field as keyof LoginInput, { message: messages[0] });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {formError && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Couldn&apos;t sign you in</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <FieldGroup>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="login-email">Email</FieldLabel>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            disabled={isPending}
            {...register("email")}
          />
          <FieldError errors={errors.email ? [errors.email] : undefined} />
        </Field>

        <Field data-invalid={!!errors.password}>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="login-password">Password</FieldLabel>
            <Link href={ROUTES.forgotPassword} className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            disabled={isPending}
            {...register("password")}
          />
          <FieldError errors={errors.password ? [errors.password] : undefined} />
        </Field>
      </FieldGroup>

      <Button type="submit" disabled={isPending} aria-busy={isPending} className="w-full">
        {isPending && <LoadingSpinner size="sm" className="text-current" />}
        Sign in
      </Button>
    </form>
  );
}
