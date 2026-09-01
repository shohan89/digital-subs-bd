import { CreditCard, Smartphone } from "lucide-react";

import { PAYMENT_METHODS } from "@/constants/subscription";

// lucide-react has no bKash/Nagad/Rocket brand icons (confirmed — it ships no brand/logo icons
// at all), so these are labeled generically rather than faking brand marks.
const PAYMENT_LABELS: Record<(typeof PAYMENT_METHODS)[number], string> = {
  bkash: "bKash",
  nagad: "Nagad",
  rocket: "Rocket",
  card: "Card",
  sslcommerz: "SSLCommerz",
};

export function PaymentMethodsList() {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">Payment methods</span>
      <ul className="flex flex-wrap gap-2">
        {PAYMENT_METHODS.map((method) => {
          const Icon = method === "card" ? CreditCard : Smartphone;
          return (
            <li
              key={method}
              className="flex items-center gap-1.5 rounded-lg border border-input px-2.5 py-1.5 text-xs text-muted-foreground"
            >
              <Icon className="size-3.5" aria-hidden="true" />
              {PAYMENT_LABELS[method]}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
