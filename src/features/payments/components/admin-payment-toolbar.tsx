import Link from "next/link";

import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

// Only the three statuses this dashboard is asked to show as tabs — `payments.status` also has a
// fourth value, "refunded", but there's no refund workflow built yet (see PROJECT_STRUCTURE.md's
// "not yet built" list), so a tab for it would just always be empty.
//
// Short, tab-appropriate labels, not `PAYMENT_RECORD_STATUS_LABEL` (which spells "pending" out as
// "Pending verification" — the right amount of detail next to a `Badge` on a table row, too
// verbose for a segmented-control tab; `AdminOrderToolbar`'s tabs are similarly terse).
const PAYMENT_STATUS_TABS = [
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
] as const;

export function AdminPaymentToolbar({ status }: { status?: string }) {
  return (
    <nav aria-label="Filter payments by status" className="flex flex-wrap gap-1 border-b border-border/60">
      <Link
        href={ROUTES.adminPayments}
        aria-current={!status ? "page" : undefined}
        className={cn(
          "shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
          !status ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
        )}
      >
        All
      </Link>
      {PAYMENT_STATUS_TABS.map((tab) => {
        const isActive = status === tab.value;
        return (
          <Link
            key={tab.value}
            href={`${ROUTES.adminPayments}?status=${tab.value}`}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              isActive ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
