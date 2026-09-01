"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Controller, useForm } from "react-hook-form";

import { createCouponAction, updateCouponAction } from "@/actions/coupons.actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { toast } from "@/components/ui/toast";
import { DISCOUNT_TYPE_LABEL, DISCOUNT_TYPES } from "@/constants/coupons";
import { createCouponSchema, type CreateCouponInput } from "@/features/coupons/schemas";
import type { Coupon } from "@/types/coupon";

// `<input type="number">`'s DOM value is always a string — converted before validation via
// `register(..., { setValueAs })`, not `z.coerce.number()` (breaks `zodResolver`'s type inference
// against an explicit `useForm<T>()` generic). Same pattern as `ProductForm`'s
// `toOptionalNumber`/`toRequiredNumber`.
function toRequiredNumber(raw: string): number {
  return raw === "" ? Number.NaN : Number(raw);
}
function toOptionalNumber(raw: string): number | undefined {
  return raw === "" ? undefined : Number(raw);
}
// `<input type="date">`'s DOM value is `""` when cleared, not `undefined` — same "empty means
// unset" fix `toOptionalText` applies to text fields.
function toOptionalDate(raw: string): string | undefined {
  return raw === "" ? undefined : raw;
}

function toDateInputValue(iso: string | null): string {
  return iso ? format(new Date(iso), "yyyy-MM-dd") : "";
}

type CouponFormProps = {
  /** Present in edit mode, absent when creating. */
  coupon?: Coupon;
  /** Called after a successful create/update — closes the enclosing `Modal`. */
  onSuccess: () => void;
};

export function CouponForm({ coupon, onSuccess }: CouponFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isEditMode = !!coupon;

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createCouponSchema),
    defaultValues: {
      code: coupon?.code ?? "",
      discountType: coupon?.discountType ?? "percentage",
      discountValue: coupon?.discountValue ?? 0,
      minOrderAmount: coupon?.minOrderAmount ?? undefined,
      maxDiscount: coupon?.maxDiscount ?? undefined,
      startDate: toDateInputValue(coupon?.startDate ?? null) || undefined,
      expiryDate: toDateInputValue(coupon?.expiryDate ?? null) || undefined,
      usageLimit: coupon?.usageLimit ?? undefined,
      perUserUsageLimit: coupon?.perUserUsageLimit ?? undefined,
      isActive: coupon?.isActive ?? true,
    },
  });

  function onSubmit(values: CreateCouponInput) {
    setFormError(null);
    startTransition(async () => {
      const result = isEditMode ? await updateCouponAction({ ...values, id: coupon.id }) : await createCouponAction(values);

      if (!result.success) {
        setFormError(result.error);
        for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
          if (messages?.[0]) setError(field as keyof CreateCouponInput, { message: messages[0] });
        }
        return;
      }

      toast.success(isEditMode ? "Coupon updated" : "Coupon created");
      onSuccess();
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {formError && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>{isEditMode ? "Couldn't update coupon" : "Couldn't create coupon"}</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <FieldGroup>
        <Field data-invalid={!!errors.code}>
          <FieldLabel htmlFor="coupon-code">Code</FieldLabel>
          <Input id="coupon-code" aria-invalid={!!errors.code} disabled={isPending} placeholder="SAVE10" {...register("code")} />
          <FieldError errors={errors.code ? [errors.code] : undefined} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field data-invalid={!!errors.discountType}>
            <FieldLabel htmlFor="coupon-discount-type">Discount type</FieldLabel>
            <Controller
              control={control}
              name="discountType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                  <SelectTrigger id="coupon-discount-type" aria-invalid={!!errors.discountType} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DISCOUNT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {DISCOUNT_TYPE_LABEL[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={errors.discountType ? [errors.discountType] : undefined} />
          </Field>

          <Field data-invalid={!!errors.discountValue}>
            <FieldLabel htmlFor="coupon-discount-value">Discount value</FieldLabel>
            <Input
              id="coupon-discount-value"
              type="number"
              min={0}
              step="0.01"
              aria-invalid={!!errors.discountValue}
              disabled={isPending}
              {...register("discountValue", { setValueAs: toRequiredNumber })}
            />
            <FieldError errors={errors.discountValue ? [errors.discountValue] : undefined} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field data-invalid={!!errors.minOrderAmount}>
            <FieldLabel htmlFor="coupon-min-order">Minimum order amount</FieldLabel>
            <Input
              id="coupon-min-order"
              type="number"
              min={0}
              step="0.01"
              placeholder="No minimum"
              aria-invalid={!!errors.minOrderAmount}
              disabled={isPending}
              {...register("minOrderAmount", { setValueAs: toOptionalNumber })}
            />
            <FieldError errors={errors.minOrderAmount ? [errors.minOrderAmount] : undefined} />
          </Field>

          <Field data-invalid={!!errors.maxDiscount}>
            <FieldLabel htmlFor="coupon-max-discount">Maximum discount</FieldLabel>
            <Input
              id="coupon-max-discount"
              type="number"
              min={0}
              step="0.01"
              placeholder="No cap"
              aria-invalid={!!errors.maxDiscount}
              disabled={isPending}
              {...register("maxDiscount", { setValueAs: toOptionalNumber })}
            />
            <FieldError errors={errors.maxDiscount ? [errors.maxDiscount] : undefined} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field data-invalid={!!errors.startDate}>
            <FieldLabel htmlFor="coupon-start-date">Start date</FieldLabel>
            <Input
              id="coupon-start-date"
              type="date"
              aria-invalid={!!errors.startDate}
              disabled={isPending}
              {...register("startDate", { setValueAs: toOptionalDate })}
            />
            <FieldError errors={errors.startDate ? [errors.startDate] : undefined} />
          </Field>

          <Field data-invalid={!!errors.expiryDate}>
            <FieldLabel htmlFor="coupon-expiry-date">Expiry date</FieldLabel>
            <Input
              id="coupon-expiry-date"
              type="date"
              aria-invalid={!!errors.expiryDate}
              disabled={isPending}
              {...register("expiryDate", { setValueAs: toOptionalDate })}
            />
            <FieldError errors={errors.expiryDate ? [errors.expiryDate] : undefined} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field data-invalid={!!errors.usageLimit}>
            <FieldLabel htmlFor="coupon-usage-limit">Usage limit</FieldLabel>
            <Input
              id="coupon-usage-limit"
              type="number"
              min={1}
              placeholder="Unlimited"
              aria-invalid={!!errors.usageLimit}
              disabled={isPending}
              {...register("usageLimit", { setValueAs: toOptionalNumber })}
            />
            <FieldDescription>Total redemptions allowed, across all customers.</FieldDescription>
            <FieldError errors={errors.usageLimit ? [errors.usageLimit] : undefined} />
          </Field>

          <Field data-invalid={!!errors.perUserUsageLimit}>
            <FieldLabel htmlFor="coupon-per-user-limit">Per-customer limit</FieldLabel>
            <Input
              id="coupon-per-user-limit"
              type="number"
              min={1}
              placeholder="Unlimited"
              aria-invalid={!!errors.perUserUsageLimit}
              disabled={isPending}
              {...register("perUserUsageLimit", { setValueAs: toOptionalNumber })}
            />
            <FieldDescription>Redemptions allowed per customer.</FieldDescription>
            <FieldError errors={errors.perUserUsageLimit ? [errors.perUserUsageLimit] : undefined} />
          </Field>
        </div>

        <Field orientation="horizontal" data-invalid={!!errors.isActive}>
          <Controller
            control={control}
            name="isActive"
            render={({ field }) => (
              <input
                id="coupon-is-active"
                type="checkbox"
                checked={field.value}
                onChange={(event) => field.onChange(event.target.checked)}
                disabled={isPending}
                className="size-4 rounded border-input"
              />
            )}
          />
          <FieldLabel htmlFor="coupon-is-active" className="font-normal">
            Active
          </FieldLabel>
        </Field>
      </FieldGroup>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending} aria-busy={isPending}>
          {isPending && <LoadingSpinner size="sm" className="text-current" />}
          {isEditMode ? "Save changes" : "Create coupon"}
        </Button>
      </div>
    </form>
  );
}
