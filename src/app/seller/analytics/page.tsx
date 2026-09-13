import type { Metadata } from "next";

import { requireApprovedSeller } from "@/lib/rbac";
import { getSellerDashboardStats } from "@/features/seller/queries";
import { resolveDateRange } from "@/lib/date-range";
import { formatCurrency } from "@/lib/currency";
import { DateRangeSelect } from "@/components/dashboard/date-range-select";
import { TimeSeriesChart } from "@/components/dashboard/time-series-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Analytics" };

export default async function SellerAnalyticsPage({ searchParams }: PageProps<"/seller/analytics">) {
  const seller = await requireApprovedSeller();
  const sp = await searchParams;
  const rangeKey = Array.isArray(sp.range) ? sp.range[0] : sp.range;
  const { from, label } = resolveDateRange(rangeKey ?? "30d");
  const stats = await getSellerDashboardStats(seller.sellerId, from);

  const avgOrderValue = stats.ordersCount > 0 ? stats.totalSales / stats.ordersCount : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <DateRangeSelect />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Revenue</p><p className="text-2xl font-bold">{formatCurrency(stats.totalSales)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Orders</p><p className="text-2xl font-bold">{stats.ordersCount}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Avg. Order Value</p><p className="text-2xl font-bold">{formatCurrency(avgOrderValue)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Customers</p><p className="text-2xl font-bold">{stats.customersCount}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Revenue & Orders Over Time</CardTitle></CardHeader>
        <CardContent>
          <TimeSeriesChart
            data={stats.revenueSeries}
            config={{ revenue: { label: "Revenue", color: "var(--chart-1)" }, orders: { label: "Orders", color: "var(--chart-2)" } }}
            dataKeys={["revenue", "orders"]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Top Products by Units Sold</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Units Sold</TableHead><TableHead>Revenue</TableHead></TableRow></TableHeader>
            <TableBody>
              {stats.topProducts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.quantity}</TableCell>
                  <TableCell>{formatCurrency(p.revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
