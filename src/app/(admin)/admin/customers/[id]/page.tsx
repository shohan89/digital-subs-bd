import type { Metadata } from "next";
import { notFound, unstable_rethrow } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { USER_ROLE_BADGE_VARIANT } from "@/constants/status-badges";
import { USER_ROLE_LABEL } from "@/constants/customers";
import {
  CustomerAccountActions,
  CustomerProfileCard,
  CustomerRecentOrdersCard,
  CustomerStatsGrid,
} from "@/features/customers/components";
import { requireAdmin } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { customersService, ordersService, productsService } from "@/services";
import type { Customer, CustomerStats } from "@/types/customer";
import type { Order } from "@/types/order";

type CustomerDetailPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = { title: "Customer Details" };

const RECENT_ORDERS_LIMIT = 5;

type CustomerDetailData = {
  customer: Customer;
  stats: CustomerStats;
  recentOrders: Order[];
  products: { id: string; name: string }[];
};

async function getCustomerDetail(customerId: string): Promise<CustomerDetailData | null> {
  const supabase = await createServerSupabaseClient();

  const customer = await customersService.getCustomerById(supabase, customerId);
  if (!customer) return null;

  const [stats, recentOrders, allProducts] = await Promise.all([
    customersService.getCustomerStats(supabase, customerId),
    ordersService.listOrdersForUser(supabase, customerId, { limit: RECENT_ORDERS_LIMIT }),
    productsService.listProductsForAdmin(supabase),
  ]);

  return { customer, stats, recentOrders, products: allProducts.map((product) => ({ id: product.id, name: product.name })) };
}

/** Admin-only, not staff — same reasoning as `/admin/customers` itself. */
export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const currentUser = await requireAdmin();
  const { id } = await params;

  let data: CustomerDetailData | null;
  try {
    data = await getCustomerDetail(id);
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to load customer detail", error);
    return (
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <Alert variant="destructive">
          <AlertDescription>Couldn&apos;t load this customer right now. Please try again shortly.</AlertDescription>
        </Alert>
      </main>
    );
  }

  if (!data) notFound();
  const { customer, stats, recentOrders, products } = data;

  // Mirrors `setCustomerDisabledAction`'s own guards — computed here so the UI never offers a
  // button the action would just reject anyway.
  const canDisable = customer.id !== currentUser.id && customer.role !== "admin";

  return (
    <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold">{customer.fullName ?? customer.email}</h1>
            <Badge variant={USER_ROLE_BADGE_VARIANT[customer.role]}>{USER_ROLE_LABEL[customer.role]}</Badge>
            {customer.disabled && <Badge variant="destructive">Disabled</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{customer.email}</p>
        </div>

        <CustomerAccountActions customer={customer} products={products} canDisable={canDisable} />
      </div>

      <CustomerStatsGrid stats={stats} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <CustomerRecentOrdersCard orders={recentOrders} />
        </div>
        <div className="flex flex-col gap-6">
          <CustomerProfileCard customer={customer} />
        </div>
      </div>
    </main>
  );
}
