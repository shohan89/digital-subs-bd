import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  sm: "size-4",
  md: "size-6",
  lg: "size-10",
} as const;

type LoadingSpinnerProps = {
  size?: keyof typeof SIZE_CLASSES;
  label?: string;
  className?: string;
};

/**
 * Brand-colored loading indicator. `role="status"` + `label` announce the wait to screen readers.
 * Plain CSS `animate-spin` (Tailwind's built-in keyframe, via `tw-animate-css`), not a
 * `framer-motion` rotate loop — this is the single most-reused component in the app (every submit
 * button's pending state), so this alone keeps `framer-motion` out of every file that only needed
 * it for this spinner. No hooks, no browser-only API — safe to render from a Server Component too,
 * which a `motion.span` never was.
 */
export function LoadingSpinner({ size = "md", label = "Loading", className }: LoadingSpinnerProps) {
  return (
    <span role="status" className="inline-flex items-center justify-center">
      <LoaderCircle className={cn("animate-spin text-primary", SIZE_CLASSES[size], className)} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
