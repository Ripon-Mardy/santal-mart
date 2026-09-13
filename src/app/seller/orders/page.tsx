import type { Metadata } from "next";
import Link from "next/link";
import { Download, ShoppingCart } from "lucide-react";

import { requireApprovedSeller } from "@/lib/rbac";
import { getSellerOrders } from "@/features/seller/order-queries";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Orders" };

const STATUS_TABS = ["", "PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

export default async function SellerOrdersPage({ searchParams }: PageProps<"/seller/orders">) {
  const seller = await requireApprovedSeller();
  const sp = await searchParams;
  const params = new URLSearchParams(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : (v ?? "")]));
  const result = await getSellerOrders(seller.sellerId, params);
  const activeStatus = params.get("status") ?? "";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2 overflow-x-auto">
        {STATUS_TABS.map((s) => (
          <Link
            key={s}
            href={s ? `/seller/orders?status=${s}` : "/seller/orders"}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${activeStatus === s ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"}`}
          >
            {s || "All"}
          </Link>
        ))}
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <a href="/api/seller/export/orders"><Download className="size-4" /> Export CSV</a>
        </Button>
      </div>

      {result.items.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="No orders found" description="Orders from customers will appear here." />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((so) => (
                <TableRow key={so.id}>
                  <TableCell>
                    <Link href={`/seller/orders/${so.id}`} className="font-medium hover:text-primary">{so.subOrderNumber}</Link>
                    <p className="text-xs text-muted-foreground">{so.order.orderNumber}</p>
                  </TableCell>
                  <TableCell className="text-sm">{so.order.user.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{so.items.length} item(s)</TableCell>
                  <TableCell className="text-sm">
                    {so.order.paymentMethod.replace(/_/g, " ")}
                    <p className="text-xs text-muted-foreground">{so.order.paymentStatus}</p>
                  </TableCell>
                  <TableCell><StatusBadge status={so.status} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(so.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex justify-center">
        <PaginationBar page={result.page} totalPages={result.totalPages} basePath="/seller/orders" searchParams={Object.fromEntries(params)} />
      </div>
    </div>
  );
}
