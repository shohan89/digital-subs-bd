import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  className?: string;
};

export function StatCard({ label, value, icon: Icon, className }: StatCardProps) {
  return (
    <Card className={cn(className)}>
      <CardContent className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          {/* No `truncate` — at 6-column desktop grids ("Completed Orders", "Active Subscriptions")
           * a single-line ellipsis clipped to "Completed Ord…"/"Active Subscrip…", found in a UI
           * audit. Wrapping to two lines keeps the full label readable at every grid width. */}
          <span className="text-xs font-medium text-balance text-muted-foreground">{label}</span>
          <span className="text-xl font-semibold tracking-tight sm:text-2xl">{value}</span>
        </div>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4.5" aria-hidden="true" />
        </div>
      </CardContent>
    </Card>
  );
}
