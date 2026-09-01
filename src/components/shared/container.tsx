import type { ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  default: "max-w-7xl",
  narrow: "max-w-3xl",
  wide: "max-w-[90rem]",
} as const;

type ContainerProps = {
  as?: ElementType;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
  children?: ReactNode;
};

/** Centered, responsive max-width wrapper with consistent horizontal padding — the base layout primitive every section sits inside. */
export function Container({ as: Tag = "div", size = "default", className, children }: ContainerProps) {
  return <Tag className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", SIZE_CLASSES[size], className)}>{children}</Tag>;
}
