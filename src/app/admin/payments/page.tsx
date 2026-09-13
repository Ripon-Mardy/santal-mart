import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard } from "lucide-react";

import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { parsePagination, paginate } from "@/lib/pagination";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Payments" };

export default async function AdminPaymentsPage({ searchParams }: PageProps<"/admin/payments">) {
  await requireAdmin();
  const sp = await searchParams;
  const params = new URLSearchParams(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : (v ?? "")]));
  const { page, skip, take } = parsePagination(params);

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: { order: { select: { orderNumber: true, user: { select: { name: true } } } } },
    }),
    prisma.payment.count(),
  ]);
  const result = paginate(payments, total, page, take);

  if (result.items.length === 0) return <EmptyState icon={CreditCard} title="No payments yet" />;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Method</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
          <TableBody>
            {result.items.map((p) => (
              <TableRow key={p.id}>
                <TableCell><Link href={`/admin/orders/${p.orderId}`} className="font-medium hover:text-primary">{p.order.orderNumber}</Link></TableCell>
                <TableCell className="text-sm">{p.order.user.name}</TableCell>
                <TableCell className="text-sm">{p.method.replace(/_/g, " ")}</TableCell>
                <TableCell className="text-sm">{formatCurrency(Number(p.amount))}</TableCell>
                <TableCell><StatusBadge status={p.status} /></TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(p.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-center"><PaginationBar page={result.page} totalPages={result.totalPages} basePath="/admin/payments" /></div>
    </div>
  );
}
