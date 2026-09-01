"use client";

import { useId } from "react";
import type { FieldError as RHFFieldError, UseFormRegisterReturn } from "react-hook-form";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type PaymentUploadFieldProps = {
  transactionIdRegister: UseFormRegisterReturn;
  transactionIdError?: RHFFieldError;
  screenshotError?: string;
  onScreenshotChange: (file: File | null) => void;
  disabled?: boolean;
};

/** Transaction ID + payment screenshot upload — the proof an admin manually verifies against the
 * "Send Money" instructions in `PaymentMethodSelector`. The screenshot isn't part of the RHF/Zod
 * form schema (see `features/checkout/schemas.ts`'s doc comment on why), so its error is a plain
 * string prop rather than an RHF field error. */
export function PaymentUploadField({
  transactionIdRegister,
  transactionIdError,
  screenshotError,
  onScreenshotChange,
  disabled,
}: PaymentUploadFieldProps) {
  const transactionIdId = useId();
  const screenshotId = useId();

  return (
    <>
      <Field data-invalid={!!transactionIdError}>
        <FieldLabel htmlFor={transactionIdId}>Transaction ID</FieldLabel>
        <Input
          id={transactionIdId}
          placeholder="e.g. 8N7A2X9K3P"
          aria-invalid={!!transactionIdError}
          disabled={disabled}
          {...transactionIdRegister}
        />
        <FieldError errors={transactionIdError ? [transactionIdError] : undefined} />
      </Field>

      <Field data-invalid={!!screenshotError}>
        <FieldLabel htmlFor={screenshotId}>Payment screenshot</FieldLabel>
        <Input
          id={screenshotId}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aria-invalid={!!screenshotError}
          disabled={disabled}
          onChange={(event) => onScreenshotChange(event.target.files?.[0] ?? null)}
        />
        <FieldError errors={screenshotError ? [{ message: screenshotError }] : undefined} />
      </Field>
    </>
  );
}
