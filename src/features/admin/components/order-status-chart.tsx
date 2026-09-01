"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ORDER_STATUS, ORDER_STATUS_LABEL, type OrderStatus } from "@/constants/subscription";
import { cn } from "@/lib/utils";

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending: "var(--color-chart-2)",
  processing: "var(--color-chart-1)",
  completed: "var(--color-chart-3)",
  cancelled: "var(--color-chart-5)",
};

type OrderStatusChartProps = {
  counts: Record<OrderStatus, number>;
  className?: string;
};

export function OrderStatusChart({ counts, className }: OrderStatusChartProps) {
  const data = ORDER_STATUS.map((status) => ({ status, label: ORDER_STATUS_LABEL[status], value: counts[status] }));
  const total = data.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>Order analytics</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {total === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">No orders yet.</div>
        ) : (
          <>
            <div className="relative h-40 w-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={2}
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {data.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLOR[entry.status]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, _name, item) => {
                      const count = Number(value);
                      return [`${count} order${count === 1 ? "" : "s"}`, item.payload.label];
                    }}
                    contentStyle={{
                      background: "var(--color-popover)",
                      color: "var(--color-popover-foreground)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-semibold">{total}</span>
                <span className="text-[11px] text-muted-foreground">orders</span>
              </div>
            </div>

            <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {data.map((entry) => (
                <li key={entry.status} className="flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: STATUS_COLOR[entry.status] }}
                    aria-hidden="true"
                  />
                  <span className="text-muted-foreground">{entry.label}</span>
                  <span className="ml-auto font-medium">{entry.value}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
