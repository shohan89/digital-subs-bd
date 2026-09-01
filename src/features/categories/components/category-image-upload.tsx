"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";

import { uploadCategoryImageAction } from "@/actions/categories.actions";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { toast } from "@/components/ui/toast";
import { IMAGE_ALLOWED_TYPES } from "@/constants/images";

type CategoryImageUploadProps = {
  value: string | undefined;
  onChange: (url: string | undefined) => void;
  disabled?: boolean;
};

/** Single-image control for the category form — same shape as
 * `features/products/components/product-image-upload.tsx`, just uploading to the
 * `category-images` bucket via `uploadCategoryImageAction` instead. */
export function CategoryImageUpload({ value, onChange, disabled }: CategoryImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadCategoryImageAction(formData);
    setIsUploading(false);
    if (inputRef.current) inputRef.current.value = "";

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    onChange(result.data.url);
  }

  const isBusy = disabled || isUploading;

  return (
    <div className="flex items-start gap-3">
      <div className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted">
        {value ? (
          <Image src={value} alt="" fill sizes="96px" className="object-cover" />
        ) : (
          <ImagePlus className="size-5 text-muted-foreground" aria-hidden="true" />
        )}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <LoadingSpinner size="sm" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={IMAGE_ALLOWED_TYPES.join(",")}
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
          disabled={isBusy}
          tabIndex={-1}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={isBusy}>
          {value ? "Replace image" : "Upload image"}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(undefined)} disabled={isBusy}>
            <X aria-hidden="true" />
            Remove
          </Button>
        )}
        <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP. Up to 5MB.</p>
      </div>
    </div>
  );
}
