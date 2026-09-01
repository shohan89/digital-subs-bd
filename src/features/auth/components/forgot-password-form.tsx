"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";

import { forgotPasswordAction } from "@/actions/auth.actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { toast } from "@/components/ui/toast";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/features/auth/schemas";

export function ForgotPasswordForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  function onSubmit(values: ForgotPasswordInput) {
    setFormError(null);

    const formData = new FormData();
    formData.set("email", values.email);

    startTransition(async () => {
      const result = await forgotPasswordAction(null, formData);
      if (!result.success) {
        setFormError(result.error);
        return;
      }
      setIsSent(true);
      toast.success("Password reset email sent");
    });
  }

  if (isSent) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        If an account exists for that email, we&apos;ve sent a link to reset your password. Check your inbox.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {formError && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Couldn&apos;t send reset email</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <Field data-invalid={!!errors.email}>
        <FieldLabel htmlFor="forgot-password-email">Email</FieldLabel>
        <Input
          id="forgot-password-email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          disabled={isPending}
          {...register("email")}
        />
        <FieldError errors={errors.email ? [errors.email] : undefined} />
      </Field>

      <Button type="submit" disabled={isPending} aria-busy={isPending} className="w-full">
        {isPending && <LoadingSpinner size="sm" className="text-current" />}
        Send reset link
      </Button>
    </form>
  );
}
