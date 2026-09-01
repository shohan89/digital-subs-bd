"use client";

import { useState } from "react";
import Image from "next/image";
import { Package } from "lucide-react";

import { cn } from "@/lib/utils";

type ProductGalleryProps = {
  images: string[];
  productName: string;
};

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl bg-muted">
        <Package className="size-16 text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
        <Image
          src={images[active]}
          alt={productName}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
          priority
        />
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {images.map((src, index) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show image ${index + 1} of ${images.length}`}
              aria-current={index === active}
              className={cn(
                "relative aspect-square overflow-hidden rounded-lg ring-2 transition-colors",
                index === active ? "ring-primary" : "ring-transparent hover:ring-border",
              )}
            >
              <Image src={src} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
