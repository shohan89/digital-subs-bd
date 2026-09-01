import { RefreshCw, ShoppingCart, Wallet, XCircle } from "lucide-react";

import { StatCard } from "@/features/admin/components/stat-card";
import { formatCurrency } from "@/utils/format-currency";
import type { CustomerStats } from "@/types/customer";

export function CustomerStatsGrid({ stats }: { stats: CustomerStats }) {
  const cards = [
    { label: "Total Orders", value: stats.totalOrders.toLocaleString(), icon: ShoppingCart },
    { label: "Total Spending", value: formatCurrency(stats.totalSpending), icon: Wallet },
    { label: "Active Subscriptions", value: stats.activeSubscriptions.toLocaleString(), icon: RefreshCw },
    { label: "Expired Subscriptions", value: stats.expiredSubscriptions.toLocaleString(), icon: XCircle },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  );
}
