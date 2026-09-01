import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SectionTitleProps = {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  className?: string;
};

/** Standard section header: optional eyebrow label, heading, optional supporting copy. */
export function SectionTitle({ eyebrow, title, description, align = "left", className }: SectionTitleProps) {
  return (
    <div className={cn("flex flex-col gap-3", align === "center" && "items-center text-center", className)}>
      {eyebrow && (
        <span className="text-xs font-semibold tracking-widest text-primary uppercase">{eyebrow}</span>
      )}
      <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      {description && <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">{description}</p>}
    </div>
  );
}
