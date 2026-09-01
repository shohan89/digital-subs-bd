import { IMAGE_ALLOWED_TYPES, IMAGE_EXTENSION, IMAGE_MAX_BYTES } from "@/constants/images";
import type { PaymentMethod, PaymentRecordStatus } from "@/constants/subscription";
import type { DbClient } from "@/services/types";
import type { Payment, PaymentWithOrder } from "@/types/payment";

const SCREENSHOT_BUCKET = "payment-screenshots";
const SCREENSHOT_SIGNED_URL_TTL_SECONDS = 5 * 60;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw row shape, DbClient is untyped until database.types.ts is generated (see comment there)
function mapPayment(row: any): Payment {
  return {
    id: row.id,
    orderId: row.order_id,
    method: row.method,
    transactionId: row.transaction_id,
    screenshot: row.screenshot,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
function mapPaymentWithOrder(row: any): PaymentWithOrder {
  return {
    ...mapPayment(row),
    order: {
      id: row.order.id,
      userId: row.order.user_id,
      customerName: row.order.customer_name,
      customerEmail: row.order.customer_email,
      customerPhone: row.order.customer_phone,
      totalAmount: Number(row.order.total_amount),
    },
  };
}

/**
 * Uploads to the private `payment-screenshots` bucket and returns the storage path (not a
 * public URL — the bucket is private; a future admin-review UI would sign a URL to view it).
 *
 * Validates type/size itself now, against the same shared `IMAGE_ALLOWED_TYPES`/`IMAGE_MAX_BYTES`
 * every other upload function uses (`uploadProductImage`/`uploadCategoryImage`) — this function
 * used to trust its one caller (`checkout.actions.ts`) to have already checked, using its own
 * locally re-duplicated copy of the same constants. That made this function unsafe to call from
 * any future code path that forgot to validate first; a real gap found in a security audit, not
 * hypothetical. The storage path extension is derived from the *validated* MIME type via
 * `IMAGE_EXTENSION`, not from the client-supplied `file.name` — the previous
 * `file.name.split(".").pop()` let a crafted filename (e.g. containing an extra `/`) splice
 * unsanitized text into the storage object key, the same "never let user input reach the storage
 * path" invariant `uploadProductImage`'s own doc comment establishes.
 */
export async function uploadPaymentScreenshot(db: DbClient, orderId: string, file: File): Promise<string> {
  const allowedType = IMAGE_ALLOWED_TYPES.find((type) => type === file.type);
  if (!allowedType) throw new Error("Please upload a JPEG, PNG, or WebP image.");
  if (file.size > IMAGE_MAX_BYTES) {
    throw new Error(`Image is too large — please keep it under ${IMAGE_MAX_BYTES / (1024 * 1024)}MB.`);
  }

  const extension = IMAGE_EXTENSION[allowedType];
  const path = `${orderId}/${crypto.randomUUID()}.${extension}`;

  const { error } = await db.storage.from(SCREENSHOT_BUCKET).upload(path, file, {
    contentType: allowedType,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function deletePaymentScreenshot(db: DbClient, path: string) {
  await db.storage.from(SCREENSHOT_BUCKET).remove([path]);
}

export type CreatePaymentInput = {
  orderId: string;
  method: PaymentMethod;
  transactionId: string;
  screenshot: string;
};

export async function getPaymentByOrderId(db: DbClient, orderId: string): Promise<Payment | null> {
  const { data, error } = await db.from("payments").select("*").eq("order_id", orderId).maybeSingle();
  if (error) throw error;
  return data ? mapPayment(data) : null;
}

export async function getPaymentById(db: DbClient, paymentId: string): Promise<Payment | null> {
  const { data, error } = await db.from("payments").select("*").eq("id", paymentId).maybeSingle();
  if (error) throw error;
  return data ? mapPayment(data) : null;
}

/** Admin verification queue — payments still awaiting review, oldest first, with just enough
 * order/customer context to review without a second query per row. `limit` is optional — the
 * full `/admin/payments` queue page wants every pending row, the dashboard's summary section
 * only wants the oldest few. */
export async function listPendingPayments(db: DbClient, limit?: number): Promise<PaymentWithOrder[]> {
  let query = db
    .from("payments")
    .select("*, order:orders(id, user_id, customer_name, customer_email, customer_phone, total_amount)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (limit !== undefined) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapPaymentWithOrder);
}

export type AdminListPaymentsOptions = {
  /** Max rows to return. Same "fetch one extra, slice, check hasMore" contract as
   * `listOrdersForAdmin`/`listProductsForAdmin` — pass `pageSize + 1` and handle it on the result
   * yourself. */
  limit?: number;
  offset?: number;
};

/** Admin payment verification dashboard's list — every status, not just pending (unlike
 * `listPendingPayments`, the review-queue-only query). Newest first when browsing a specific
 * status (matches the orders/products/categories admin lists' convention), rather than
 * `listPendingPayments`' oldest-first (a queue you work through in submission order). */
export async function listPaymentsForAdmin(
  db: DbClient,
  filters: { status?: PaymentRecordStatus } = {},
  options: AdminListPaymentsOptions = {},
): Promise<PaymentWithOrder[]> {
  let query = db
    .from("payments")
    .select("*, order:orders(id, user_id, customer_name, customer_email, customer_phone, total_amount)")
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (options.offset !== undefined && options.limit !== undefined) {
    query = query.range(options.offset, options.offset + options.limit - 1);
  } else if (options.limit !== undefined) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapPaymentWithOrder);
}

/** Time-limited signed URL into the private `payment-screenshots` bucket — for an admin to view a
 * submitted screenshot. Never store or reuse this URL past its TTL; generate fresh per view. */
export async function getScreenshotSignedUrl(db: DbClient, path: string): Promise<string> {
  const { data, error } = await db.storage
    .from(SCREENSHOT_BUCKET)
    .createSignedUrl(path, SCREENSHOT_SIGNED_URL_TTL_SECONDS);
  if (error) throw error;
  return data.signedUrl;
}

export async function createPayment(db: DbClient, input: CreatePaymentInput): Promise<Payment> {
  const { data, error } = await db
    .from("payments")
    .insert({
      order_id: input.orderId,
      method: input.method,
      transaction_id: input.transactionId,
      screenshot: input.screenshot,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    // `payments_transaction_id_key` — the same transaction ID was already submitted for another
    // order. Surface a message the checkout form can show next to the transaction ID field.
    if (error.code === "23505") {
      throw new Error("This transaction ID has already been submitted. Please check and try again.");
    }
    throw error;
  }
  return mapPayment(data);
}
