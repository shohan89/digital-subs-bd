import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  /** Icon shown above the message. Omit for a bare inline line (e.g. inside a `Card` that already
   * has its own heading, where a full bordered box would be redundant — see `OrderTimelineCard`). */
  icon?: LucideIcon;
  message: string;
  /** Optional second line — more detail than `message` alone, e.g. "Try clearing some filters." */
  description?: string;
  action?: ReactNode;
  className?: string;
};

/**
 * One shared empty state instead of the dashed-border-box-plus-message pattern that was hand-rolled
 * with slightly different padding/border in ~20 places (every admin table, every dashboard list,
 * `EmptyCart`, ...) — found during a UI audit. Covers both the "this is the whole page/section
 * content" case (pass `icon`, get a bordered, padded box) and the "one line inside an
 * already-titled `Card`" case (omit `icon`, get bare centered text, same as before).
 */
export function EmptyState({ icon: Icon, message, description, action, className }: EmptyStateProps) {
  if (!Icon) {
    return <p className={cn("text-sm text-muted-foreground", className)}>{message}</p>;
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 px-8 py-12 text-center",
        className,
      )}
    >
      <Icon className="size-8 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {description && <p className="text-xs text-muted-foreground/80">{description}</p>}
      {action}
    </div>
  );
}
