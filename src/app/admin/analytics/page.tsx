import type { Metadata } from "next";

import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getAdminDashboardStats, getGrowthSeries } from "@/features/admin/queries";
import { resolveDateRange } from "@/lib/date-range";
import { formatCurrency } from "@/lib/currency";
import { DateRangeSelect } from "@/components/dashboard/date-range-select";
import { TimeSeriesChart } from "@/components/dashboard/time-series-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Analytics Overview" };

export default async function AdminAnalyticsPage({ searchParams }: PageProps<"/admin/analytics">) {
  await requireAdmin();
  const sp = await searchParams;
  const rangeKey = Array.isArray(sp.range) ? sp.range[0] : sp.range;
  const { from, label } = resolveDateRange(rangeKey ?? "30d");

  const [stats, growth, productCount] = await Promise.all([
    getAdminDashboardStats(from),
    getGrowthSeries(from),
    prisma.product.count({ where: { createdAt: { gte: from } } }),
  ]);

  const avgOrderValue = stats.ordersCount > 0 ? stats.totalRevenue / stats.ordersCount : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <DateRangeSelect />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">GMV</p><p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Platform Commission</p><p className="text-2xl font-bold">{formatCurrency(stats.platformCommission)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Avg. Order Value</p><p className="text-2xl font-bold">{formatCurrency(avgOrderValue)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">New Products</p><p className="text-2xl font-bold">{productCount}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Revenue Over Time</CardTitle></CardHeader>
        <CardContent><TimeSeriesChart data={stats.revenueSeries} config={{ revenue: { label: "Revenue", color: "var(--chart-1)" }, orders: { label: "Orders", color: "var(--chart-2)" } }} dataKeys={["revenue", "orders"]} /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Seller & Customer Growth</CardTitle></CardHeader>
        <CardContent><TimeSeriesChart data={growth} config={{ sellers: { label: "Sellers", color: "var(--chart-2)" }, customers: { label: "Customers", color: "var(--chart-3)" } }} dataKeys={["sellers", "customers"]} /></CardContent>
      </Card>
    </div>
  );
}
