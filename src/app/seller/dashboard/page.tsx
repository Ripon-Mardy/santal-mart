import type { Metadata } from "next";
import { DollarSign, ShoppingCart, Package, AlertTriangle, Users, Wallet, Clock } from "lucide-react";

import { requireApprovedSeller } from "@/lib/rbac";
import { getSellerDashboardStats } from "@/features/seller/queries";
import { resolveDateRange } from "@/lib/date-range";
import { formatCurrency } from "@/lib/currency";
import { StatCard } from "@/components/dashboard/stat-card";
import { TimeSeriesChart } from "@/components/dashboard/time-series-chart";
import { DateRangeSelect } from "@/components/dashboard/date-range-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Seller Dashboard" };

export default async function SellerDashboardPage({ searchParams }: PageProps<"/seller/dashboard">) {
  const seller = await requireApprovedSeller();
  const sp = await searchParams;
  const rangeKey = Array.isArray(sp.range) ? sp.range[0] : sp.range;
  const { from, label } = resolveDateRange(rangeKey);

  const stats = await getSellerDashboardStats(seller.sellerId, from);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Showing data for: {label}</p>
        <DateRangeSelect />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Sales" value={formatCurrency(stats.totalSales)} icon={DollarSign} />
        <StatCard label="Today's Sales" value={formatCurrency(stats.todaySales)} icon={Clock} />
        <StatCard label="Orders" value={String(stats.ordersCount)} icon={ShoppingCart} href="/seller/orders" />
        <StatCard label="Pending Orders" value={String(stats.pendingOrdersCount)} icon={ShoppingCart} href="/seller/orders?status=PENDING" />
        <StatCard label="Products" value={String(stats.productsCount)} icon={Package} href="/seller/products" />
        <StatCard label="Low Stock Products" value={String(stats.lowStockCount)} icon={AlertTriangle} href="/seller/inventory" />
        <StatCard label="Available Balance" value={formatCurrency(stats.availableBalance)} icon={Wallet} href="/seller/payouts" />
        <StatCard label="Customers" value={String(stats.customersCount)} icon={Users} href="/seller/customers" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Revenue Over Time</CardTitle></CardHeader>
          <CardContent>
            <TimeSeriesChart
              data={stats.revenueSeries}
              config={{ revenue: { label: "Revenue", color: "var(--chart-1)" } }}
              dataKeys={["revenue"]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Top Products</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {stats.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales yet in this period.</p>
            ) : (
              stats.topProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="line-clamp-1 flex-1">{p.name}</span>
                  <span className="text-muted-foreground">{p.quantity} sold</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
