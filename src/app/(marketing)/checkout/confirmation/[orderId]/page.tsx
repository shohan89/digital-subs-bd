import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { ROUTES } from "@/constants/routes";
import { siteConfig } from "@/constants/site";
import { ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_RECORD_STATUS_LABEL } from "@/constants/subscription";
import { requireUser } from "@/lib/auth/session";
import { NOINDEX_ROBOTS } from "@/lib/seo";
import { getPublicSettings } from "@/lib/settings";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ordersService, paymentsService } from "@/services";
import { formatCurrency } from "@/utils/format-currency";
import { buildOrderSupportMessage } from "@/utils/whatsapp";

// One customer's own order — never indexable regardless of the requireUser() check below.
export const metadata: Metadata = { title: "Order Confirmed", robots: NOINDEX_ROBOTS };

type CheckoutConfirmationPageProps = {
  params: Promise<{ orderId: string }>;
};

// Protected the same way as `/checkout` (see that page's comment) — `requireUser()` here is
// mostly redundant with `RLS`'s "Orders: view own" policy (an unauthenticated/other-user request
// would just get `null` back below either way), kept for the same defense-in-depth reason.
export default async function CheckoutConfirmationPage({ params }: CheckoutConfirmationPageProps) {
  await requireUser();
  const { orderId } = await params;

  const supabase = await createServerSupabaseClient();

  let order;
  try {
    order = await ordersService.getOrderById(supabase, orderId);
  } catch {
    return (
      <Container className="py-16">
        <Alert variant="destructive">
          <AlertDescription>Couldn&apos;t load this order right now. Please try again shortly.</AlertDescription>
        </Alert>
      </Container>
    );
  }
  // RLS scopes this to the signed-in user's own orders — another user's order id lands here too,
  // indistinguishable from a genuinely unknown one, which is the correct behavior either way.
  if (!order) notFound();

  const payment = await paymentsService.getPaymentByOrderId(supabase, order.id).catch(() => null);

  // Non-critical, same fallback pattern as `/products/[slug]`'s identical fetch for
  // `ProductPurchasePanel` — a settings outage shouldn't block the order-confirmation page itself.
  const settings = await getPublicSettings().catch(() => null);
  const whatsappNumber = settings?.general.whatsappNumber ?? siteConfig.links.whatsapp.replace(/\D/g, "");
  const storeName = settings?.general.storeName ?? siteConfig.name;

  return (
    <Container className="flex flex-col items-center gap-8 py-16 text-center">
      <div className="flex flex-col items-center gap-3">
        <CheckCircle2 className="size-12 text-primary" aria-hidden="true" />
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Order placed</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          We&apos;ve received your order and payment details. We&apos;ll verify your payment and get your
          subscription ready shortly.
        </p>
      </div>

      <div className="w-full max-w-lg rounded-xl border border-border/60 p-6 text-left">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <span className="text-sm text-muted-foreground">Order reference</span>
          <span className="font-mono text-xs">{order.id}</span>
        </div>

        <div className="flex flex-col divide-y divide-border/60 py-4">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between pt-3 text-sm first:pt-0">
              <span>
                {item.product?.name ?? "Product"} × {item.quantity}
              </span>
              <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1.5 border-t border-border/60 pt-4">
          {order.discountAmount > 0 && (
            <>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(order.totalAmount + order.discountAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</span>
                <span>-{formatCurrency(order.discountAmount)}</span>
              </div>
            </>
          )}
          <div className="flex items-center justify-between">
            <span className="font-medium">Total</span>
            <span className="text-base font-semibold">{formatCurrency(order.totalAmount)}</span>
          </div>
        </div>

        <dl className="mt-4 flex flex-col gap-2 border-t border-border/60 pt-4 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Order status</dt>
            <dd>{ORDER_STATUS_LABEL[order.status]}</dd>
          </div>
          {payment && (
            <>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Payment method</dt>
                <dd>{PAYMENT_METHOD_LABEL[payment.method]}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Payment status</dt>
                <dd>{PAYMENT_RECORD_STATUS_LABEL[payment.status]}</dd>
              </div>
            </>
          )}
        </dl>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild variant="outline">
          <Link href={ROUTES.shop}>Continue shopping</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`${ROUTES.orderTracking}?orderId=${order.id}`}>Track this order</Link>
        </Button>
        <Button asChild>
          <Link href={ROUTES.dashboardOrders}>View my orders</Link>
        </Button>
        <WhatsAppButton
          phoneNumber={whatsappNumber}
          message={buildOrderSupportMessage(order.id, storeName)}
          variant="outline"
          label="Get help with this order"
        />
      </div>
    </Container>
  );
}
