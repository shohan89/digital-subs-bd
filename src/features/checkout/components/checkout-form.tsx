"use client";

import { useId, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";

import { createCheckoutOrderAction } from "@/actions/checkout.actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { ROUTES } from "@/constants/routes";
import { EmptyCart } from "@/features/cart/components/empty-cart";
import { CheckoutOrderSummary, type AppliedCoupon } from "@/features/checkout/components/checkout-order-summary";
import { PaymentMethodSelector } from "@/features/checkout/components/payment-method-selector";
import { PaymentUploadField } from "@/features/checkout/components/payment-upload-field";
import { checkoutFormSchema, type CheckoutFormInput } from "@/features/checkout/schemas";
import { useCart } from "@/hooks/use-cart";
import type { PaymentSettings } from "@/types/settings";
import type { UserProfile } from "@/types/user";

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
const ALLOWED_SCREENSHOT_TYPES = ["image/png", "image/jpeg", "image/webp"];

/** Client-side mirror of the server's screenshot checks (`actions/checkout.actions.ts`) — for
 * fast feedback only, the server re-validates independently and is what's actually trusted. */
function validateScreenshot(file: File | null): string | undefined {
  if (!file) return "Upload a screenshot of your payment";
  if (!ALLOWED_SCREENSHOT_TYPES.includes(file.type)) return "Upload a PNG, JPEG, or WEBP image";
  if (file.size > MAX_SCREENSHOT_BYTES) return "Image must be smaller than 5MB";
  return undefined;
}

export function CheckoutForm({ user, paymentNumbers }: { user: UserProfile; paymentNumbers: PaymentSettings }) {
  const router = useRouter();
  const { items, subtotal, isLoading: isCartLoading, clearCart } = useCart();
  const [formError, setFormError] = useState<string | null>(null);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotError, setScreenshotError] = useState<string | undefined>();
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [isPending, startTransition] = useTransition();

  const nameId = useId();
  const emailId = useId();
  const phoneId = useId();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<CheckoutFormInput>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      name: user.fullName ?? "",
      email: user.email,
      phone: user.phone ?? "",
    },
  });

  const paymentMethod = watch("paymentMethod");

  function onSubmit(values: CheckoutFormInput) {
    setFormError(null);

    const screenshotIssue = validateScreenshot(screenshot);
    if (screenshotIssue) {
      setScreenshotError(screenshotIssue);
      return;
    }

    const formData = new FormData();
    formData.set("name", values.name);
    formData.set("email", values.email);
    formData.set("phone", values.phone);
    formData.set("paymentMethod", values.paymentMethod);
    formData.set("transactionId", values.transactionId);
    formData.set("paymentScreenshot", screenshot as File);
    if (appliedCoupon) formData.set("couponCode", appliedCoupon.code);
    formData.set(
      "items",
      JSON.stringify(
        items.map((item) => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity })),
      ),
    );

    startTransition(async () => {
      const result = await createCheckoutOrderAction(formData);
      if (!result.success) {
        setFormError(result.error);
        for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
          if (!messages?.[0]) continue;
          if (field === "paymentScreenshot") {
            setScreenshotError(messages[0]);
          } else {
            setError(field as keyof CheckoutFormInput, { message: messages[0] });
          }
        }
        return;
      }
      clearCart();
      router.push(ROUTES.checkoutConfirmation(result.data.orderId));
    });
  }

  if (isCartLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" label="Loading checkout" />
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyCart className="py-20" />;
  }

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
        {formError && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Couldn&apos;t place your order</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-4">
          <h2 className="font-heading text-base font-medium">Customer information</h2>
          <FieldGroup>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor={nameId}>Name</FieldLabel>
              <Input
                id={nameId}
                autoComplete="name"
                aria-invalid={!!errors.name}
                disabled={isPending}
                {...register("name")}
              />
              <FieldError errors={errors.name ? [errors.name] : undefined} />
            </Field>

            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor={emailId}>Email</FieldLabel>
              <Input
                id={emailId}
                type="email"
                autoComplete="email"
                aria-invalid={!!errors.email}
                disabled={isPending}
                {...register("email")}
              />
              <FieldError errors={errors.email ? [errors.email] : undefined} />
            </Field>

            <Field data-invalid={!!errors.phone}>
              <FieldLabel htmlFor={phoneId}>Phone</FieldLabel>
              <Input
                id={phoneId}
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
        </div>

        <div className="flex flex-col gap-4">
          <PaymentMethodSelector
            value={paymentMethod}
            onChange={(method) => setValue("paymentMethod", method, { shouldValidate: true })}
            error={errors.paymentMethod}
            paymentNumbers={paymentNumbers}
          />

          <FieldGroup>
            <PaymentUploadField
              transactionIdRegister={register("transactionId")}
              transactionIdError={errors.transactionId}
              screenshotError={screenshotError}
              onScreenshotChange={(file) => {
                setScreenshot(file);
                setScreenshotError(undefined);
              }}
              disabled={isPending}
            />
          </FieldGroup>
        </div>

        <Button type="submit" size="lg" disabled={isPending} aria-busy={isPending} className="w-full">
          {isPending && <LoadingSpinner size="sm" className="text-current" />}
          Submit order
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Need help? <Link href={ROUTES.cart} className="underline underline-offset-4">Review your cart</Link> before
          submitting.
        </p>
      </form>

      <div className="lg:sticky lg:top-20 lg:h-fit">
        <CheckoutOrderSummary items={items} subtotal={subtotal} onCouponChange={setAppliedCoupon} />
      </div>
    </div>
  );
}
