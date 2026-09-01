"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Sparkles } from "lucide-react";
import { Controller, useForm } from "react-hook-form";

import { createCategoryAction, updateCategoryAction } from "@/actions/categories.actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { toast } from "@/components/ui/toast";
import { CATEGORY_STATUSES, CATEGORY_STATUS_LABEL } from "@/constants/categories";
import { CategoryImageUpload } from "@/features/categories/components/category-image-upload";
import { createCategorySchema, type CreateCategoryInput } from "@/features/categories/schemas";
import { slugify } from "@/utils/slugify";
import type { Category } from "@/types/category";

const TEXTAREA_CLASSNAME =
  "min-h-24 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80";

// Same "empty means unset, not a too-short value" fix as `ProductForm` — an empty `<textarea>`'s
// DOM value is `""`, not `undefined`, and `.optional()` alone doesn't save it from `.min()`
// failing. See `product-form.tsx`'s `toOptionalText` for the bug this avoided repeating.
function toOptionalText(raw: string): string | undefined {
  return raw.trim() === "" ? undefined : raw;
}

type CategoryFormProps = {
  /** Present in edit mode, absent when creating. */
  category?: Category;
  /** Called after a successful create/update — closes the enclosing `Modal`. */
  onSuccess: () => void;
};

export function CategoryForm({ category, onSuccess }: CategoryFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isEditMode = !!category;

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: category?.name ?? "",
      slug: category?.slug ?? "",
      description: category?.description ?? undefined,
      image: category?.image ?? undefined,
      status: category?.status ?? "active",
    },
  });

  function generateSlug() {
    const name = getValues("name");
    if (!name.trim()) return;
    setValue("slug", slugify(name), { shouldValidate: true, shouldDirty: true });
  }

  function onSubmit(values: CreateCategoryInput) {
    setFormError(null);
    startTransition(async () => {
      const result = isEditMode
        ? await updateCategoryAction({ ...values, id: category.id })
        : await createCategoryAction(values);

      if (!result.success) {
        setFormError(result.error);
        for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
          if (messages?.[0]) setError(field as keyof CreateCategoryInput, { message: messages[0] });
        }
        return;
      }

      toast.success(isEditMode ? "Category updated" : "Category created");
      onSuccess();
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {formError && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>{isEditMode ? "Couldn't update category" : "Couldn't create category"}</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <FieldGroup>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="category-name">Name</FieldLabel>
          <Input id="category-name" aria-invalid={!!errors.name} disabled={isPending} {...register("name")} />
          <FieldError errors={errors.name ? [errors.name] : undefined} />
        </Field>

        <Field data-invalid={!!errors.slug}>
          <FieldLabel htmlFor="category-slug">Slug</FieldLabel>
          <div className="flex gap-2">
            <Input id="category-slug" aria-invalid={!!errors.slug} disabled={isPending} {...register("slug")} className="flex-1" />
            <Button type="button" variant="outline" size="sm" onClick={generateSlug} disabled={isPending}>
              <Sparkles aria-hidden="true" />
              Generate
            </Button>
          </div>
          <FieldError errors={errors.slug ? [errors.slug] : undefined} />
        </Field>

        <Field data-invalid={!!errors.description}>
          <FieldLabel htmlFor="category-description">Description</FieldLabel>
          <textarea
            id="category-description"
            placeholder="Optional — shown on the category landing page"
            aria-invalid={!!errors.description}
            disabled={isPending}
            className={TEXTAREA_CLASSNAME}
            rows={3}
            {...register("description", { setValueAs: toOptionalText })}
          />
          <FieldError errors={errors.description ? [errors.description] : undefined} />
        </Field>

        <Field data-invalid={!!errors.status}>
          <FieldLabel htmlFor="category-status">Status</FieldLabel>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                <SelectTrigger id="category-status" aria-invalid={!!errors.status} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {CATEGORY_STATUS_LABEL[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={errors.status ? [errors.status] : undefined} />
        </Field>

        <Field data-invalid={!!errors.image}>
          <FieldLabel>Image</FieldLabel>
          <Controller
            control={control}
            name="image"
            render={({ field }) => <CategoryImageUpload value={field.value} onChange={field.onChange} disabled={isPending} />}
          />
          <FieldError errors={errors.image ? [errors.image] : undefined} />
        </Field>
      </FieldGroup>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending} aria-busy={isPending}>
          {isPending && <LoadingSpinner size="sm" className="text-current" />}
          {isEditMode ? "Save changes" : "Create category"}
        </Button>
      </div>
    </form>
  );
}
