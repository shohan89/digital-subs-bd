import { Headset, ShieldCheck, Zap } from "lucide-react";

const ITEMS = [
  { icon: Zap, label: "Instant delivery after payment confirmation" },
  { icon: ShieldCheck, label: "Verified, working account guaranteed" },
  { icon: Headset, label: "24/7 support on WhatsApp" },
];

/** Compact right-column snippet — the full walkthrough is `DeliverySteps` ("How Delivery Works"). */
export function DeliveryInfo() {
  return (
    <ul className="flex flex-col gap-1.5">
      {ITEMS.map(({ icon: Icon, label }) => (
        <li key={label} className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
          {label}
        </li>
      ))}
    </ul>
  );
}
