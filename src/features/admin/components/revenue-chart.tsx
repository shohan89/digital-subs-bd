"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/format-currency";
import { formatDate } from "@/utils/format-date";
import type { RevenuePoint, RevenueRange, RevenueSeriesByRange } from "@/types/admin";

const RANGES: RevenueRange[] = ["7d", "30d", "90d", "all"];
const RANGE_LABEL: Record<RevenueRange, string> = { "7d": "7 days", "30d": "30 days", "90d": "90 days", all: "All time" };

function axisLabel(dateStr: string, range: RevenueRange) {
  return formatDate(dateStr, range === "all" ? "MMM yyyy" : "d MMM");
}

/**
 * `series` arrives pre-fetched for all four ranges (`adminService.getRevenueSeries`) — switching
 * the range here is a local state swap between already-loaded arrays, not a new server request.
 */
export function RevenueChart({ series, className }: { series: RevenueSeriesByRange; className?: string }) {
  const [range, setRange] = useState<RevenueRange>("30d");
  const data: RevenuePoint[] = series[range];
  const total = data.reduce((sum, point) => sum + point.revenue, 0);
  const hasRevenue = total > 0;

  return (
    <Card className={cn(className)}>
      <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Revenue analytics</CardTitle>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{formatCurrency(total)}</p>
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Revenue range">
          {RANGES.map((r) => (
            <Button
              key={r}
              type="button"
              size="sm"
              variant={r === range ? "secondary" : "ghost"}
              aria-pressed={r === range}
              onClick={() => setRange(r)}
            >
              {RANGE_LABEL[r]}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="h-64">
        {!hasRevenue ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No revenue yet for this range.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="admin-revenue-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--color-border)" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => axisLabel(value, range)}
                tickLine={false}
                axisLine={false}
                fontSize={11}
                stroke="var(--color-muted-foreground)"
                minTickGap={24}
              />
              <YAxis
                tickFormatter={(value: number) => formatCurrency(value)}
                tickLine={false}
                axisLine={false}
                fontSize={11}
                stroke="var(--color-muted-foreground)"
                width={64}
              />
              <Tooltip
                formatter={(value) => [formatCurrency(Number(value)), "Revenue"]}
                labelFormatter={(value) => axisLabel(String(value), range)}
                contentStyle={{
                  background: "var(--color-popover)",
                  color: "var(--color-popover-foreground)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--color-primary)"
                strokeWidth={2}
                fill="url(#admin-revenue-fill)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
