import type { AdminOrderFilterStatus } from "@/constants/orders";
import type { OrderStatus } from "@/constants/subscription";
import * as orderActivityService from "@/services/order-activity.service";
import type { DbClient } from "@/services/types";
import type { Order, OrderItem } from "@/types/order";
import type { OrderActivityAction } from "@/types/order-activity";
import { getValidNextStatuses, isValidOrderStatusTransition } from "@/utils/order-status";
import { escapeOrFilterValue } from "@/utils/postgrest";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw row shape, DbClient is untyped until database.types.ts is generated (see comment there)
function mapOrderItem(row: any): OrderItem {
  return {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id,
    price: Number(row.price),
    quantity: row.quantity,
    createdAt: row.created_at,
    product: row.product ? { name: row.product.name, slug: row.product.slug, image: row.product.image } : null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
function mapOrder(row: any): Order {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    paymentStatus: row.payment_status,
    totalAmount: Number(row.total_amount),
    discountAmount: Number(row.discount_amount),
    couponCode: row.coupon_code,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    items: (row.items ?? []).map(mapOrderItem),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const ORDER_SELECT = "*, items:order_items(*, product:products(name, slug, image))";

/** `offset` only takes effect alongside `limit` — same "fetch `pageSize + 1`, slice, check
 * `hasMore`" contract as every other paginated list in this app (see `/dashboard/orders`). */
export async function listOrdersForUser(
  db: DbClient,
  userId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<Order[]> {
  let query = db.from("orders").select(ORDER_SELECT).eq("user_id", userId).order("created_at", { ascending: false });
  if (options.offset !== undefined && options.limit !== undefined) {
    query = query.range(options.offset, options.offset + options.limit - 1);
  } else if (options.limit !== undefined) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapOrder);
}

/** Admin dashboard's "Recent Orders" section — newest first, capped at `limit` so the query
 * (and the page) never grows with the store's total order history. */
export async function listRecentOrders(db: DbClient, limit = 8): Promise<Order[]> {
  const { data, error } = await db
    .from("orders")
    .select(ORDER_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(mapOrder);
}

export async function getOrderById(db: DbClient, orderId: string): Promise<Order | null> {
  const { data, error } = await db.from("orders").select(ORDER_SELECT).eq("id", orderId).maybeSingle();
  if (error) throw error;
  return data ? mapOrder(data) : null;
}

const FULL_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AdminOrderFilters = {
  search?: string;
  filterStatus?: AdminOrderFilterStatus;
};

export type AdminListOrdersOptions = {
  /** Max rows to return. Same "fetch one extra, slice, check hasMore" contract as
   * `listProductsForAdmin` — pass `pageSize + 1` and handle it on the result yourself. */
  limit?: number;
  offset?: number;
};

/**
 * Admin order list — search and the 5-way `AdminOrderFilterStatus` (see `constants/orders.ts`'s
 * doc comment on why that's a different shape from the raw `orders.status` enum).
 *
 * Search matches a *full* order id exactly (order ids are random UUIDs; nobody realistically
 * types a partial one) or a partial, case-insensitive match against customer name/email/phone.
 * The customer-fields branch runs through `escapeOrFilterValue` — never interpolate a raw search
 * term into `.or()` unescaped, see that function's doc comment for why.
 */
export async function listOrdersForAdmin(
  db: DbClient,
  filters: AdminOrderFilters = {},
  options: AdminListOrdersOptions = {},
): Promise<Order[]> {
  let query = db.from("orders").select(ORDER_SELECT);

  switch (filters.filterStatus) {
    case "payment_review":
      query = query.eq("status", "pending").eq("payment_status", "pending");
      break;
    case "pending":
      query = query.eq("status", "pending").neq("payment_status", "pending");
      break;
    case "processing":
      query = query.eq("status", "processing");
      break;
    case "completed":
      query = query.eq("status", "completed");
      break;
    case "cancelled":
      query = query.eq("status", "cancelled");
      break;
    default:
      break; // no filter — every status
  }

  if (filters.search) {
    const term = filters.search.trim();
    if (FULL_UUID_PATTERN.test(term)) {
      query = query.eq("id", term);
    } else if (term) {
      const pattern = escapeOrFilterValue(`%${term}%`);
      query = query.or(`customer_name.ilike.${pattern},customer_email.ilike.${pattern},customer_phone.ilike.${pattern}`);
    }
  }

  query = query.order("created_at", { ascending: false });

  if (options.offset !== undefined && options.limit !== undefined) {
    query = query.range(options.offset, options.offset + options.limit - 1);
  } else if (options.limit !== undefined) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapOrder);
}

/**
 * "Verified buyer" pre-check for review submission — a friendlier, earlier error than letting the
 * insert fail against `reviews`' RLS policy (`"Reviews: insert own verified buyer"`, which encodes
 * this exact same join/condition and is the actual enforcement; this function only decides whether
 * to show the review form and gives a clear message, it isn't itself the security boundary).
 */
export async function hasCompletedOrderForProduct(db: DbClient, userId: string, productId: string): Promise<boolean> {
  const { data, error } = await db
    .from("orders")
    .select("id, items:order_items!inner(product_id)")
    .eq("user_id", userId)
    .eq("status", "completed")
    .eq("items.product_id", productId)
    .limit(1);
  if (error) throw error;
  return (data ?? []).length > 0;
}

/** Public order-tracking lookup — requires an exact match on *both* `orderId` and
 * `customerPhone`, since this runs with no session (see `orderTrackingService.trackOrder`). Never
 * relax this to an `orderId`-only lookup; the phone number is what stops the order id alone
 * (shared in a URL, screenshot, etc.) from being enough to see someone else's order. */
export async function getOrderForTracking(db: DbClient, orderId: string, customerPhone: string): Promise<Order | null> {
  const { data, error } = await db
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", orderId)
    .eq("customer_phone", customerPhone)
    .maybeSingle();
  if (error) throw error;
  return data ? mapOrder(data) : null;
}

export type CreateOrderInput = {
  userId: string;
  totalAmount: number;
  /** Already net of any coupon discount — see `discountAmount`/`couponCode` below. */
  discountAmount?: number;
  couponCode?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
};

/** Inserts the `orders` row and records the opening `order_created` activity entry —
 * `checkoutService.placeOrder` is what composes this with `createOrderItems`/payment creation
 * into the full checkout write (which separately records `payment_submitted` once the payment row
 * exists). No `actorId`/`actorName` for this entry (`null`): placement is customer-triggered, and
 * this runs on the service-role client during checkout with no staff actor to attribute it to. */
export async function createOrder(db: DbClient, input: CreateOrderInput): Promise<Order> {
  const { data, error } = await db
    .from("orders")
    .insert({
      user_id: input.userId,
      status: "pending",
      payment_status: "pending",
      total_amount: input.totalAmount,
      discount_amount: input.discountAmount ?? 0,
      coupon_code: input.couponCode ?? null,
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      customer_phone: input.customerPhone,
    })
    .select()
    .single();
  if (error) throw error;
  const order = mapOrder(data);

  await orderActivityService.recordActivity(db, {
    orderId: order.id,
    actorId: null,
    actorName: null,
    action: "order_created",
    newStatus: order.status,
  });

  return order;
}

export type CreateOrderItemInput = { productId: string; quantity: number; price: number };

export async function createOrderItems(db: DbClient, orderId: string, items: CreateOrderItemInput[]) {
  const { error } = await db.from("order_items").insert(
    items.map((item) => ({
      order_id: orderId,
      product_id: item.productId,
      quantity: item.quantity,
      price: item.price,
    })),
  );
  if (error) throw error;
}

/** Rollback helper for a failed checkout write — cascades to `order_items`/`payments`/
 * `order_activity` (all `ON DELETE CASCADE` on `order_id`), so deleting the order alone is enough
 * to clean up. */
export async function deleteOrder(db: DbClient, orderId: string) {
  const { error } = await db.from("orders").delete().eq("id", orderId);
  if (error) throw error;
}

/** Raw status setter — no transition validation, no activity log. `changeOrderStatus` below is
 * the validated, logged entry point every admin action should call instead; this stays exported
 * only because `changeOrderStatus` needs it internally and it's a reasonable low-level primitive. */
export async function updateOrderStatus(db: DbClient, orderId: string, status: OrderStatus): Promise<Order> {
  const { data, error } = await db.from("orders").update({ status }).eq("id", orderId).select().single();
  if (error) throw error;
  return mapOrder(data);
}

export type ChangeOrderStatusInput = {
  orderId: string;
  nextStatus: OrderStatus;
  actorId: string;
  actorName: string;
  note?: string;
};

/** `nextStatus` -> the specific `OrderActivityAction` it should be logged as — there's no generic
 * "status_changed" action in this schema's vocabulary (see `order_activity`'s migration), every
 * fulfillment transition gets its own named event. `"pending"` is unreachable here (nothing ever
 * transitions *into* pending — see `ORDER_STATUS_TRANSITIONS`), so it has no entry. */
const STATUS_CHANGE_ACTION: Partial<Record<OrderStatus, OrderActivityAction>> = {
  processing: "order_processing",
  completed: "order_completed",
  cancelled: "order_cancelled",
};

/**
 * The validated, logged way to change `orders.status` — rejects the transition (a plain `Error`,
 * not a silent no-op) if `utils/order-status.ts`'s transition table doesn't allow moving from the
 * order's *current* status to `nextStatus` given its *current* payment status, then records the
 * matching activity entry (`order_processing`/`order_completed`/`order_cancelled`) alongside the
 * update. `updateOrderStatusAction` (the only caller) should never call the raw
 * `updateOrderStatus` directly — that would skip both checks.
 */
export async function changeOrderStatus(db: DbClient, input: ChangeOrderStatusInput): Promise<Order> {
  const order = await getOrderById(db, input.orderId);
  if (!order) throw new Error("Order not found");

  if (!isValidOrderStatusTransition(order.status, input.nextStatus, order.paymentStatus)) {
    const validNext = getValidNextStatuses(order.status, order.paymentStatus);
    throw new Error(
      validNext.length > 0
        ? `Can't move this order from "${order.status}" to "${input.nextStatus}" right now.`
        : `This order's status ("${order.status}") can't be changed further.`,
    );
  }

  const updated = await updateOrderStatus(db, input.orderId, input.nextStatus);

  const action = STATUS_CHANGE_ACTION[input.nextStatus];
  if (!action) throw new Error(`No activity action mapped for status "${input.nextStatus}"`);

  await orderActivityService.recordActivity(db, {
    orderId: input.orderId,
    actorId: input.actorId,
    actorName: input.actorName,
    action,
    oldStatus: order.status,
    newStatus: input.nextStatus,
    note: input.note ?? null,
  });

  return updated;
}

