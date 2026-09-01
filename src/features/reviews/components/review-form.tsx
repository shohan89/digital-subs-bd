"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
import { Controller, useForm } from "react-hook-form";

import { createReviewAction } from "@/actions/reviews.actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { toast } from "@/components/ui/toast";
import { StarRatingInput } from "@/features/reviews/components/star-rating-input";
import { createReviewSchema, type CreateReviewInput } from "@/features/reviews/schemas";

// `productId` isn't rendered as a field — merged in at submit time (see `onSubmit`) rather than
// carried as an unregistered RHF value, which would be fragile to rely on.
type ReviewFormValues = Omit<CreateReviewInput, "productId">;

const TEXTAREA_CLASSNAME =
  "min-h-24 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80";

export function ReviewForm({ productId }: { productId: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(createReviewSchema.omit({ productId: true })),
    defaultValues: { rating: 0, comment: "" },
  });

  function onSubmit(values: ReviewFormValues) {
    setFormError(null);
    startTransition(async () => {
      const result = await createReviewAction({ ...values, productId });
      if (!result.success) {
        setFormError(result.error);
        return;
      }
      toast.success("Review submitted — it'll show once an admin approves it.");
      setSubmitted(true);
      router.refresh();
    });
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-border/60 p-5 text-sm text-muted-foreground">
        Thanks! Your review is pending approval and will appear once it&apos;s reviewed.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4 rounded-xl border border-border/60 p-5">
      <h3 className="font-heading text-base font-medium">Write a review</h3>

      {formError && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <Field data-invalid={!!errors.rating}>
        <FieldLabel>Rating</FieldLabel>
        <Controller
          control={control}
          name="rating"
          render={({ field }) => <StarRatingInput value={field.value} onChange={field.onChange} disabled={isPending} />}
        />
        <FieldError errors={errors.rating ? [errors.rating] : undefined} />
      </Field>

      <Field data-invalid={!!errors.comment}>
        <FieldLabel htmlFor="review-comment">Comment</FieldLabel>
        <textarea
          id="review-comment"
          placeholder="What did you think of this product?"
          aria-invalid={!!errors.comment}
          disabled={isPending}
          className={TEXTAREA_CLASSNAME}
          {...register("comment")}
        />
        <FieldError errors={errors.comment ? [errors.comment] : undefined} />
      </Field>

      <Button type="submit" disabled={isPending} aria-busy={isPending} className="w-fit">
        {isPending && <LoadingSpinner size="sm" className="text-current" />}
        Submit review
      </Button>
    </form>
  );
}
