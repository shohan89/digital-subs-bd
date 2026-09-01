"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Sparkles } from "lucide-react";
import { Controller, useForm } from "react-hook-form";

import { createProductAction, updateProductAction } from "@/actions/products.actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { toast } from "@/components/ui/toast";
import { PRODUCT_STATUSES, PRODUCT_STATUS_LABEL } from "@/constants/products";
import { ROUTES } from "@/constants/routes";
import { ProductFeaturesInput } from "@/features/products/components/product-features-input";
import { ProductGalleryUpload } from "@/features/products/components/product-gallery-upload";
import { ProductImageUpload } from "@/features/products/components/product-image-upload";
import { productFormSchema, type ProductFormValues } from "@/features/products/schemas";
import { slugify } from "@/utils/slugify";
import type { Category } from "@/types/category";
import type { Product } from "@/types/product";

const TEXTAREA_CLASSNAME =
  "min-h-24 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80";

// Radix `SelectItem` rejects an empty-string `value` — "no category" is represented by this
// sentinel and translated back to `undefined` on submit.
const NO_CATEGORY = "none";

// `<input type="number">`'s DOM value is always a string — these run inside RHF's `register(...,
// { setValueAs })` so a real `number` (or `undefined` for an empty optional field) reaches the
// Zod schema directly, instead of leaning on `z.coerce.number()` (see the doc comment on
// `baseProductSchema`'s `price` field for why that breaks `zodResolver`'s type inference here).
function toOptionalNumber(raw: string): number | undefined {
  return raw === "" ? undefined : Number(raw);
}

function toRequiredNumber(raw: string): number {
  return raw === "" ? Number.NaN : Number(raw);
}

// Same "empty means unset, not a too-short value" problem as the number fields — an empty
// `<textarea>`'s DOM value is `""`, not `undefined`, and `z.string().min(10).optional()` still
// runs `.min(10)` against `""` (it's a defined string, just a short one), failing validation for
// an admin who simply left an optional field blank. Real bug caught in testing: creating a
// product with no short description/description was rejected as "Invalid input" with no visible
// reason why. `undefined` short-circuits `.optional()` before `.min()` ever runs.
function toOptionalText(raw: string): string | undefined {
  return raw.trim() === "" ? undefined : raw;
}

type ProductFormProps = {
  categories: Category[];
  /** Present in edit mode, absent when creating. */
  product?: Product;
};

export function ProductForm({ categories, product }: ProductFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isEditMode = !!product;

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product?.name ?? "",
      slug: product?.slug ?? "",
      categoryId: product?.categoryId ?? undefined,
      shortDescription: product?.shortDescription ?? undefined,
      description: product?.description ?? undefined,
      price: product?.price,
      comparePrice: product?.comparePrice ?? undefined,
      duration: product?.duration ?? undefined,
      image: product?.image ?? undefined,
      gallery: product?.gallery ?? [],
      features: product?.features ?? [],
      status: product?.status ?? "draft",
    },
  });

  function generateSlug() {
    const name = getValues("name");
    if (!name.trim()) return;
    setValue("slug", slugify(name), { shouldValidate: true, shouldDirty: true });
  }

  function onSubmit(values: ProductFormValues) {
    setFormError(null);
    startTransition(async () => {
      const result = isEditMode
        ? await updateProductAction({ ...values, id: product.id })
        : await createProductAction(values);

      if (!result.success) {
        setFormError(result.error);
        for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
          if (messages?.[0]) setError(field as keyof ProductFormValues, { message: messages[0] });
        }
        return;
      }

      toast.success(isEditMode ? "Product updated" : "Product created");
      router.push(ROUTES.adminProducts);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex max-w-3xl flex-col gap-6">
      {formError && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>{isEditMode ? "Couldn't update product" : "Couldn't create product"}</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <FieldGroup>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="product-name">Name</FieldLabel>
          <Input id="product-name" aria-invalid={!!errors.name} disabled={isPending} {...register("name")} />
          <FieldError errors={errors.name ? [errors.name] : undefined} />
        </Field>

        <Field data-invalid={!!errors.slug}>
          <FieldLabel htmlFor="product-slug">Slug</FieldLabel>
          <div className="flex gap-2">
            <Input id="product-slug" aria-invalid={!!errors.slug} disabled={isPending} {...register("slug")} className="flex-1" />
            <Button type="button" variant="outline" size="sm" onClick={generateSlug} disabled={isPending}>
              <Sparkles aria-hidden="true" />
              Generate
            </Button>
          </div>
          <FieldError errors={errors.slug ? [errors.slug] : undefined} />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.categoryId}>
            <FieldLabel htmlFor="product-category">Category</FieldLabel>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Select
                  value={field.value ?? NO_CATEGORY}
                  onValueChange={(value) => field.onChange(value === NO_CATEGORY ? undefined : value)}
                  disabled={isPending}
                >
                  <SelectTrigger id="product-category" aria-invalid={!!errors.categoryId} className="w-full">
                    <SelectValue placeholder="No category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY}>No category</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={errors.categoryId ? [errors.categoryId] : undefined} />
          </Field>

          <Field data-invalid={!!errors.status}>
            <FieldLabel htmlFor="product-status">Status</FieldLabel>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                  <SelectTrigger id="product-status" aria-invalid={!!errors.status} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {PRODUCT_STATUS_LABEL[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={errors.status ? [errors.status] : undefined} />
          </Field>
        </div>

        <Field data-invalid={!!errors.shortDescription}>
          <FieldLabel htmlFor="product-short-description">Short description</FieldLabel>
          <textarea
            id="product-short-description"
            placeholder="One or two sentences shown in product cards and previews"
            aria-invalid={!!errors.shortDescription}
            disabled={isPending}
            className={TEXTAREA_CLASSNAME}
            rows={2}
            {...register("shortDescription", { setValueAs: toOptionalText })}
          />
          <FieldError errors={errors.shortDescription ? [errors.shortDescription] : undefined} />
        </Field>

        <Field data-invalid={!!errors.description}>
          <FieldLabel htmlFor="product-description">Description</FieldLabel>
          <textarea
            id="product-description"
            placeholder="Full details shown on the product page"
            aria-invalid={!!errors.description}
            disabled={isPending}
            className={TEXTAREA_CLASSNAME}
            rows={5}
            {...register("description", { setValueAs: toOptionalText })}
          />
          <FieldError errors={errors.description ? [errors.description] : undefined} />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field data-invalid={!!errors.price}>
            <FieldLabel htmlFor="product-price">Price (BDT)</FieldLabel>
            <Input
              id="product-price"
              type="number"
              min={0}
              step="0.01"
              aria-invalid={!!errors.price}
              disabled={isPending}
              {...register("price", { setValueAs: toRequiredNumber })}
            />
            <FieldError errors={errors.price ? [errors.price] : undefined} />
          </Field>

          <Field data-invalid={!!errors.comparePrice}>
            <FieldLabel htmlFor="product-compare-price">Compare price (BDT)</FieldLabel>
            <Input
              id="product-compare-price"
              type="number"
              min={0}
              step="0.01"
              placeholder="Optional"
              aria-invalid={!!errors.comparePrice}
              disabled={isPending}
              {...register("comparePrice", { setValueAs: toOptionalNumber })}
            />
            <FieldError errors={errors.comparePrice ? [errors.comparePrice] : undefined} />
          </Field>

          <Field data-invalid={!!errors.duration}>
            <FieldLabel htmlFor="product-duration">Duration (days)</FieldLabel>
            <Input
              id="product-duration"
              type="number"
              min={1}
              step="1"
              placeholder="Optional"
              aria-invalid={!!errors.duration}
              disabled={isPending}
              {...register("duration", { setValueAs: toOptionalNumber })}
            />
            <FieldError errors={errors.duration ? [errors.duration] : undefined} />
          </Field>
        </div>

        <Field data-invalid={!!errors.features}>
          <FieldLabel>Features</FieldLabel>
          <Controller
            control={control}
            name="features"
            render={({ field }) => (
              <ProductFeaturesInput value={field.value ?? []} onChange={field.onChange} disabled={isPending} />
            )}
          />
          <FieldError errors={errors.features ? [errors.features] : undefined} />
        </Field>

        <Field data-invalid={!!errors.image}>
          <FieldLabel>Main image</FieldLabel>
          <Controller
            control={control}
            name="image"
            render={({ field }) => <ProductImageUpload value={field.value} onChange={field.onChange} disabled={isPending} />}
          />
          <FieldError errors={errors.image ? [errors.image] : undefined} />
        </Field>

        <Field data-invalid={!!errors.gallery}>
          <FieldLabel>Gallery images</FieldLabel>
          <Controller
            control={control}
            name="gallery"
            render={({ field }) => (
              <ProductGalleryUpload value={field.value ?? []} onChange={field.onChange} disabled={isPending} />
            )}
          />
          <FieldError errors={errors.gallery ? [errors.gallery] : undefined} />
        </Field>
      </FieldGroup>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending} aria-busy={isPending}>
          {isPending && <LoadingSpinner size="sm" className="text-current" />}
          {isEditMode ? "Save changes" : "Create product"}
        </Button>
        <Button type="button" variant="outline" disabled={isPending} onClick={() => router.push(ROUTES.adminProducts)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
