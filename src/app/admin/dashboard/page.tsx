import type { Metadata } from "next";
import Link from "next/link";
import { DollarSign, Percent, ShoppingCart, Users, Store, Package, Undo2, Wallet } from "lucide-react";

import { requireAdmin } from "@/lib/rbac";
import { getAdminDashboardStats, getGrowthSeries } from "@/features/admin/queries";
import { resolveDateRange } from "@/lib/date-range";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { StatCard } from "@/components/dashboard/stat-card";
import { TimeSeriesChart } from "@/components/dashboard/time-series-chart";
import { DateRangeSelect } from "@/components/dashboard/date-range-select";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Admin Dashboard" };

export default async function AdminDashboardPage({ searchParams }: PageProps<"/admin/dashboard">) {
  await requireAdmin();
  const sp = await searchParams;
  const rangeKey = Array.isArray(sp.range) ? sp.range[0] : sp.range;
  const { from, label } = resolveDateRange(rangeKey);

  const [stats, growth] = await Promise.all([getAdminDashboardStats(from), getGrowthSeries(from)]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Showing data for: {label}</p>
        <DateRangeSelect />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Revenue" value={formatCurrency(stats.totalRevenue)} icon={DollarSign} />
        <StatCard label="Platform Commission" value={formatCurrency(stats.platformCommission)} icon={Percent} />
        <StatCard label="Total Orders" value={String(stats.ordersCount)} icon={ShoppingCart} href="/admin/orders" />
        <StatCard label="Total Customers" value={String(stats.customersCount)} icon={Users} href="/admin/users" />
        <StatCard label="Total Sellers" value={String(stats.sellersCount)} icon={Store} href="/admin/sellers" />
        <StatCard label="Pending Sellers" value={String(stats.pendingSellersCount)} icon={Store} href="/admin/sellers?status=PENDING" />
        <StatCard label="Pending Products" value={String(stats.pendingProductsCount)} icon={Package} href="/admin/products?status=PENDING_REVIEW" />
        <StatCard label="Pending Payouts" value={String(stats.pendingPayoutsCount)} icon={Wallet} href="/admin/payouts?status=PENDING" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Revenue Over Time</CardTitle></CardHeader>
          <CardContent>
            <TimeSeriesChart data={stats.revenueSeries} config={{ revenue: { label: "Revenue", color: "var(--chart-1)" } }} dataKeys={["revenue"]} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Seller & Customer Growth</CardTitle></CardHeader>
          <CardContent>
            <TimeSeriesChart data={growth} config={{ sellers: { label: "Sellers", color: "var(--chart-2)" }, customers: { label: "Customers", color: "var(--chart-3)" } }} dataKeys={["sellers", "customers"]} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Orders</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {stats.recentOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell><Link href={`/admin/orders/${o.id}`} className="hover:text-primary">{o.orderNumber}</Link></TableCell>
                    <TableCell className="text-sm">{o.user.name}</TableCell>
                    <TableCell className="text-sm">{formatCurrency(Number(o.total))}</TableCell>
                    <TableCell><StatusBadge status={o.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Pending Seller Applications</CardTitle></CardHeader>
          <CardContent>
            {stats.pendingSellerApplications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending applications.</p>
            ) : (
              <div className="space-y-3">
                {stats.pendingSellerApplications.map((app) => (
                  <div key={app.id} className="flex items-center justify-between text-sm">
                    <div>
                      <Link href={`/admin/sellers/${app.id}`} className="font-medium hover:text-primary">{app.store?.name ?? app.businessName}</Link>
                      <p className="text-xs text-muted-foreground">{app.user.name} · {formatDate(app.createdAt)}</p>
                    </div>
                    <Link href={`/admin/sellers/${app.id}`} className="text-xs text-primary hover:underline">Review</Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {stats.lowStockProducts.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Undo2 className="size-4" /> Low Stock Products</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {stats.lowStockProducts.map((p) => (
              <Link key={p.id} href={`/admin/products/${p.id}`} className="block text-sm hover:text-primary">{p.name}</Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
