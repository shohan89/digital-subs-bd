import type { Metadata } from "next";
import { notFound, unstable_rethrow } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_BADGE_VARIANT, PAYMENT_STATUS_BADGE_VARIANT } from "@/constants/status-badges";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/constants/subscription";
import {
  OrderCustomerCard,
  OrderItemsCard,
  OrderPaymentCard,
  OrderStatusActions,
  OrderSubscriptionsCard,
  OrderTimelineCard,
} from "@/features/orders/components";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { orderActivityService, ordersService, paymentsService, subscriptionsService } from "@/services";
import { formatDate } from "@/utils/format-date";
import type { Order } from "@/types/order";
import type { OrderActivity } from "@/types/order-activity";
import type { Payment } from "@/types/payment";
import type { Subscription } from "@/types/subscription";

type OrderDetailPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = { title: "Order Details" };

type OrderDetailData = {
  order: Order;
  payment: Payment | null;
  activity: OrderActivity[];
  subscriptions: Subscription[];
};

async function getOrderDetail(orderId: string): Promise<OrderDetailData | null> {
  const supabase = await createServerSupabaseClient();

  const order = await ordersService.getOrderById(supabase, orderId);
  if (!order) return null;

  const [payment, activity, subscriptions] = await Promise.all([
    paymentsService.getPaymentByOrderId(supabase, orderId),
    orderActivityService.listActivityForOrder(supabase, orderId),
    subscriptionsService.listSubscriptionsForOrder(supabase, orderId),
  ]);

  return { order, payment, activity, subscriptions };
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params;

  let data: OrderDetailData | null;
  try {
    data = await getOrderDetail(id);
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to load order detail", error);
    return (
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <Alert variant="destructive">
          <AlertDescription>Couldn&apos;t load this order right now. Please try again shortly.</AlertDescription>
        </Alert>
      </main>
    );
  }

  if (!data) notFound();
  const { order, payment, activity, subscriptions } = data;

  return (
    <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-lg font-semibold">Order {order.id.slice(0, 8)}</h1>
            <Badge variant={ORDER_STATUS_BADGE_VARIANT[order.status]}>{ORDER_STATUS_LABEL[order.status]}</Badge>
            <Badge variant={PAYMENT_STATUS_BADGE_VARIANT[order.paymentStatus]}>{PAYMENT_STATUS_LABEL[order.paymentStatus]}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Placed {formatDate(order.createdAt, "d MMM yyyy, h:mm a")}</p>
        </div>

        <OrderStatusActions order={order} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <OrderCustomerCard order={order} />
          <OrderItemsCard order={order} />
          <OrderTimelineCard activity={activity} />
        </div>

        <div className="flex flex-col gap-6">
          <OrderPaymentCard payment={payment} />
          <OrderSubscriptionsCard subscriptions={subscriptions} />
        </div>
      </div>
    </main>
  );
}
