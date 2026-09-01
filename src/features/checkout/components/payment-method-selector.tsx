import { FieldError } from "@/components/ui/field";
import { PAYMENT_METHOD_LABEL } from "@/constants/subscription";
import { CHECKOUT_PAYMENT_METHODS, type CheckoutPaymentMethod } from "@/features/checkout/schemas";
import { cn } from "@/lib/utils";
import type { PaymentSettings } from "@/types/settings";

const PAYMENT_SETTINGS_KEY: Record<CheckoutPaymentMethod, keyof PaymentSettings> = {
  bkash: "bkashNumber",
  nagad: "nagadNumber",
  rocket: "rocketNumber",
};

type PaymentMethodSelectorProps = {
  value: CheckoutPaymentMethod | undefined;
  onChange: (method: CheckoutPaymentMethod) => void;
  error?: { message?: string };
  /** From `/admin/settings`' Payment section, fetched server-side by `/checkout/page.tsx` and
   * threaded down through `CheckoutForm` — this component itself has no data access of its own. */
  paymentNumbers: PaymentSettings;
};

/** Radio-card group for bKash/Nagad/Rocket, styled to match `ProductPurchasePanel`'s duration
 * selector — selecting a method also reveals its "Send Money" number below. */
export function PaymentMethodSelector({ value, onChange, error, paymentNumbers }: PaymentMethodSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Payment method</span>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Select payment method">
        {CHECKOUT_PAYMENT_METHODS.map((method) => (
          <button
            key={method}
            type="button"
            role="radio"
            aria-checked={method === value}
            onClick={() => onChange(method)}
            className={cn(
              "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
              method === value
                ? "border-primary bg-primary/5 text-primary"
                : "border-input text-muted-foreground hover:border-foreground/30 hover:text-foreground",
            )}
          >
            {PAYMENT_METHOD_LABEL[method]}
          </button>
        ))}
      </div>
      <FieldError errors={error ? [error] : undefined} />

      {value && (
        <div className="mt-1 rounded-lg bg-muted/50 p-3 text-sm">
          Send to <span className="font-medium">{paymentNumbers[PAYMENT_SETTINGS_KEY[value]]}</span> via{" "}
          {PAYMENT_METHOD_LABEL[value]} &quot;Send Money&quot;, then enter the transaction ID and upload a screenshot
          below.
        </div>
      )}
    </div>
  );
}
