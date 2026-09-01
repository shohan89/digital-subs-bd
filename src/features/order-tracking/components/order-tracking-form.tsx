"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Search } from "lucide-react";
import { useForm } from "react-hook-form";

import { trackOrderAction } from "@/actions/order-tracking.actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { OrderTrackingResultView } from "@/features/order-tracking/components/order-tracking-result";
import { orderTrackingSchema, type OrderTrackingInput } from "@/features/order-tracking/schemas";
import type { OrderTrackingResult } from "@/types/order-tracking";

export function OrderTrackingForm({
  defaultOrderId,
  whatsappNumber,
  storeName,
}: {
  defaultOrderId?: string;
  whatsappNumber: string;
  storeName: string;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<OrderTrackingResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OrderTrackingInput>({
    resolver: zodResolver(orderTrackingSchema),
    defaultValues: { orderId: defaultOrderId },
  });

  function onSubmit(values: OrderTrackingInput) {
    setFormError(null);
    setResult(null);

    startTransition(async () => {
      const response = await trackOrderAction(values);
      if (!response.success) {
        setFormError(response.error);
        return;
      }
      setResult(response.data);
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
            {formError && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <FieldGroup className="sm:flex-row">
              <Field data-invalid={!!errors.orderId}>
                <FieldLabel htmlFor="tracking-order-id">Order ID</FieldLabel>
                <Input
                  id="tracking-order-id"
                  placeholder="e.g. 8ea95aa9-1f5a-4d4e-a0ad-1a25e71340a5"
                  autoComplete="off"
                  aria-invalid={!!errors.orderId}
                  disabled={isPending}
                  {...register("orderId")}
                />
                <FieldError errors={errors.orderId ? [errors.orderId] : undefined} />
              </Field>

              <Field data-invalid={!!errors.phone}>
                <FieldLabel htmlFor="tracking-phone">Phone number</FieldLabel>
                <Input
                  id="tracking-phone"
                  type="tel"
                  placeholder="01XXXXXXXXX"
                  autoComplete="tel"
                  aria-invalid={!!errors.phone}
                  disabled={isPending}
                  {...register("phone")}
                />
                <FieldError errors={errors.phone ? [errors.phone] : undefined} />
              </Field>
            </FieldGroup>

            <p className="text-xs text-muted-foreground">
              Your Order ID is on your order confirmation page — the phone number is whatever you entered at checkout.
            </p>

            <Button type="submit" size="lg" disabled={isPending} aria-busy={isPending} className="w-full sm:w-fit">
              {isPending ? <LoadingSpinner size="sm" className="text-current" /> : <Search aria-hidden="true" />}
              Track order
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && <OrderTrackingResultView result={result} whatsappNumber={whatsappNumber} storeName={storeName} />}
    </div>
  );
}
