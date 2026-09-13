import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { parsePagination, paginate } from "@/lib/pagination";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "All Orders" };

const STATUS_TABS = ["", "PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireAdmin();
  const sp = await searchParams;
  const params = new URLSearchParams(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : (v ?? "")]));
  const { page, skip, take } = parsePagination(params);
  const status = params.get("status");
  const q = params.get("q");

  const where = {
    ...(status ? { status: status as never } : {}),
    ...(q ? { orderNumber: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: { user: { select: { name: true } }, sellerOrders: { select: { seller: { select: { store: { select: { name: true } } } } } } },
    }),
    prisma.order.count({ where }),
  ]);
  const result = paginate(orders, total, page, take);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto">
        {STATUS_TABS.map((s) => (
          <Link key={s} href={s ? `/admin/orders?status=${s}` : "/admin/orders"} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${status === s || (!status && !s) ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"}`}>
            {s || "All"}
          </Link>
        ))}
      </div>

      {result.items.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="No orders found" />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Sellers</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((order) => (
                <TableRow key={order.id}>
                  <TableCell><Link href={`/admin/orders/${order.id}`} className="font-medium hover:text-primary">{order.orderNumber}</Link></TableCell>
                  <TableCell className="text-sm">{order.user.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{order.sellerOrders.map((so) => so.seller.store?.name).join(", ")}</TableCell>
                  <TableCell className="text-sm">{formatCurrency(Number(order.total))}</TableCell>
                  <TableCell><StatusBadge status={order.status} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <div className="flex justify-center"><PaginationBar page={result.page} totalPages={result.totalPages} basePath="/admin/orders" /></div>
    </div>
  );
}
