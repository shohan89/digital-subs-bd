import { MessageCircle } from "lucide-react";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildWhatsAppUrl } from "@/utils/whatsapp";

export type WhatsAppButtonProps = {
  /**
   * Raw business number, digits only (e.g. "8801700000000") — always supplied by the caller,
   * never read from a constant in this file. The app's one configured source of truth is
   * `/admin/settings`' General section (`GeneralSettings.whatsappNumber`, via
   * `getPublicSettings()`/`settingsService.getSettings`); a caller with no server access of its
   * own (a client component nested under a page that already fetched it) receives it as a prop
   * instead. `undefined` renders nothing — see `FloatingWhatsAppButton` below for why a missing
   * number should never fall through to a dead link.
   */
  phoneNumber: string;
  /**
   * Prefilled `wa.me` message — keep this to non-sensitive, already-public-facing information
   * only (a store name, an order's short reference). A `wa.me` link's `text` parameter is plainly
   * visible in the URL itself, so never interpolate a password, account credential, or payment
   * detail here — see `buildOrderSupportMessage`'s doc comment for the order-specific case this
   * guards against most directly.
   */
  message?: string;
  /** `"floating"` renders a fixed circular action button (bottom-right corner, the "Floating
   * WhatsApp button" feature); `"button"`/`"outline"` render an ordinary `Button` (the "Contact
   * Support button" and "order-specific support link" features) styled via the same variant this
   * app's `Button` already uses everywhere else. */
  variant?: "floating" | "button" | "outline";
  /** Visible label for the `"button"`/`"outline"` variants, and the floating button's
   * `aria-label`/tooltip (it has no visible text). */
  label?: string;
  size?: ComponentProps<typeof Button>["size"];
  className?: string;
};

/**
 * The one reusable WhatsApp contact component every "Contact Support"/"Buy Now"/order-support CTA
 * in this app should render through — see its doc comment on `phoneNumber` for why nothing here
 * ever reads a number from a constant. Opens `wa.me` in a new tab, same as every WhatsApp link
 * already in this app (never a same-tab navigation away from the page the customer was on).
 */
export function WhatsAppButton({ phoneNumber, message, variant = "button", label = "Chat on WhatsApp", size, className }: WhatsAppButtonProps) {
  const href = buildWhatsAppUrl(phoneNumber, message);

  if (variant === "floating") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        aria-label={label}
        title={label}
        className={cn(
          "fixed right-5 bottom-5 z-50 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          className,
        )}
      >
        <MessageCircle className="size-7" aria-hidden="true" />
      </a>
    );
  }

  return (
    <Button asChild variant={variant === "outline" ? "outline" : "default"} size={size} className={className}>
      <a href={href} target="_blank" rel="noreferrer">
        <MessageCircle aria-hidden="true" />
        {label}
      </a>
    </Button>
  );
}

/**
 * Site-wide floating support bubble — mounted once per customer-facing layout
 * ((marketing)/layout.tsx, (dashboard)/layout.tsx), not the admin backend (staff aren't the
 * audience for a customer-support widget on their own tools). Renders nothing when no number is
 * configured/reachable (a settings-fetch failure, or a fresh install before an admin has set one)
 * rather than pointing at an empty `wa.me/` link.
 */
export function FloatingWhatsAppButton({ phoneNumber }: { phoneNumber: string | undefined }) {
  if (!phoneNumber) return null;
  return <WhatsAppButton phoneNumber={phoneNumber} variant="floating" label="Chat with us on WhatsApp" />;
}
