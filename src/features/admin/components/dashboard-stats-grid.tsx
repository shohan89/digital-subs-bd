import { Clock, PackageCheck, RefreshCw, ShoppingCart, Users, Wallet } from "lucide-react";

import { StatCard } from "@/features/admin/components/stat-card";
import { formatCurrency } from "@/utils/format-currency";
import type { AdminDashboardStats } from "@/types/admin";

export function DashboardStatsGrid({ stats }: { stats: AdminDashboardStats }) {
  const cards = [
    { label: "Total Revenue", value: formatCurrency(stats.totalRevenue), icon: Wallet },
    { label: "Total Orders", value: stats.totalOrders.toLocaleString(), icon: ShoppingCart },
    { label: "Pending Orders", value: stats.orderStatusCounts.pending.toLocaleString(), icon: Clock },
    { label: "Completed Orders", value: stats.orderStatusCounts.completed.toLocaleString(), icon: PackageCheck },
    { label: "Active Subscriptions", value: stats.activeSubscriptions.toLocaleString(), icon: RefreshCw },
    { label: "Total Customers", value: stats.totalCustomers.toLocaleString(), icon: Users },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  );
}
