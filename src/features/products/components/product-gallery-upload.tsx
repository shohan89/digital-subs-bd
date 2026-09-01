"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";

import { uploadProductImageAction } from "@/actions/products.actions";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { toast } from "@/components/ui/toast";
import { IMAGE_ALLOWED_TYPES } from "@/constants/images";

type ProductGalleryUploadProps = {
  value: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
};

/** Multi-image control for the "Gallery images" field — every selected file uploads in parallel
 * (via `uploadProductImageAction`), but `onChange` only fires once, after they've all settled,
 * appending every successful URL in one call. Calling `onChange([...value, url])` separately per
 * file (from inside the parallel `Promise.all`) was a real bug caught in testing: `value` is
 * captured once when `handleFiles` runs, so two uploads finishing around the same time each read
 * the *same* stale array and the faster one's URL got silently clobbered by the slower one's
 * `onChange` — selecting 2 files kept only 1 in the gallery. */
export function ProductGalleryUpload({ value, onChange, disabled }: ProductGalleryUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadingCount, setUploadingCount] = useState(0);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    setUploadingCount((count) => count + fileList.length);

    const results = await Promise.all(
      fileList.map(async (file) => {
        const formData = new FormData();
        formData.set("file", file);
        const result = await uploadProductImageAction(formData);
        setUploadingCount((count) => count - 1);
        if (!result.success) toast.error(result.error);
        return result;
      }),
    );

    const uploadedUrls = results.filter((result) => result.success).map((result) => result.data.url);
    if (uploadedUrls.length > 0) onChange([...value, ...uploadedUrls]);

    if (inputRef.current) inputRef.current.value = "";
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  const isBusy = disabled || uploadingCount > 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {value.map((url, index) => (
          <div key={url} className="relative size-20 overflow-hidden rounded-lg border border-border">
            <Image src={url} alt="" fill sizes="80px" className="object-cover" />
            <button
              type="button"
              onClick={() => removeAt(index)}
              disabled={disabled}
              aria-label="Remove image"
              className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm hover:bg-background disabled:pointer-events-none disabled:opacity-50"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </div>
        ))}

        {Array.from({ length: uploadingCount }).map((_, index) => (
          <div
            key={`uploading-${index}`}
            className="flex size-20 items-center justify-center rounded-lg border border-dashed border-border bg-muted"
          >
            <LoadingSpinner size="sm" />
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isBusy}
          aria-label="Add gallery images"
          className="flex size-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:border-ring hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        >
          <ImagePlus className="size-4" aria-hidden="true" />
          <span className="text-[11px]">Add</span>
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={IMAGE_ALLOWED_TYPES.join(",")}
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
        disabled={isBusy}
        tabIndex={-1}
      />
      <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP. Up to 5MB each.</p>
    </div>
  );
}
