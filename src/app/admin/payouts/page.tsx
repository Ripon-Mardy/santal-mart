import type { Metadata } from "next";
import Link from "next/link";
import { Wallet } from "lucide-react";

import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { parsePagination, paginate } from "@/lib/pagination";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PayoutActions } from "@/components/admin/payout-actions";

export const metadata: Metadata = { title: "Payouts" };

export default async function AdminPayoutsPage({ searchParams }: PageProps<"/admin/payouts">) {
  await requireAdmin();
  const sp = await searchParams;
  const params = new URLSearchParams(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : (v ?? "")]));
  const { page, skip, take } = parsePagination(params);
  const status = params.get("status");
  const where = status ? { status: status as never } : {};

  const [payouts, total] = await Promise.all([
    prisma.payout.findMany({
      where,
      orderBy: { requestedAt: "desc" },
      skip,
      take,
      include: { seller: { select: { businessName: true, store: { select: { name: true } } } } },
    }),
    prisma.payout.count({ where }),
  ]);
  const result = paginate(payouts, total, page, take);

  if (result.items.length === 0) return <EmptyState icon={Wallet} title="No payout requests" />;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Seller</TableHead><TableHead>Amount</TableHead><TableHead>Requested</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {result.items.map((payout) => (
              <TableRow key={payout.id}>
                <TableCell><Link href={`/admin/sellers/${payout.sellerId}`} className="font-medium hover:text-primary">{payout.seller.store?.name ?? payout.seller.businessName}</Link></TableCell>
                <TableCell className="text-sm">{formatCurrency(Number(payout.amount))}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(payout.requestedAt)}</TableCell>
                <TableCell><StatusBadge status={payout.status} /></TableCell>
                <TableCell><PayoutActions payoutId={payout.id} status={payout.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-center"><PaginationBar page={result.page} totalPages={result.totalPages} basePath="/admin/payouts" /></div>
    </div>
  );
}
