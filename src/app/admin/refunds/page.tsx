import type { Metadata } from "next";
import { Undo2 } from "lucide-react";

import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/currency";
import { formatDate, formatStatus } from "@/lib/format";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { CompleteRefundButton } from "@/components/admin/complete-refund-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Refunds" };

export default async function AdminRefundsPage() {
  await requireAdmin();

  const [pendingReturns, refunds] = await Promise.all([
    prisma.returnRequest.findMany({
      where: { status: { in: ["REQUESTED", "APPROVED"] } },
      orderBy: { requestedAt: "desc" },
      include: { orderItem: true, sellerOrder: { select: { subOrderNumber: true, seller: { select: { store: { select: { name: true } } } } } }, user: { select: { name: true } } },
    }),
    prisma.refund.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { order: { select: { orderNumber: true } } } }),
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Pending Returns</CardTitle></CardHeader>
        <CardContent>
          {pendingReturns.length === 0 ? (
            <EmptyState icon={Undo2} title="No pending returns" />
          ) : (
            <div className="space-y-3">
              {pendingReturns.map((rr) => (
                <div key={rr.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="text-sm">
                    <p className="font-medium">{rr.orderItem.productName}</p>
                    <p className="text-muted-foreground">{rr.sellerOrder.subOrderNumber} · {rr.sellerOrder.seller.store?.name} · {rr.user.name}</p>
                    <p className="text-muted-foreground">Reason: {formatStatus(rr.reason)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={rr.status} />
                    {rr.status === "APPROVED" && <CompleteRefundButton returnRequestId={rr.id} />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Refund History</CardTitle></CardHeader>
        <CardContent>
          {refunds.length === 0 ? (
            <p className="text-sm text-muted-foreground">No refunds processed yet.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Amount</TableHead><TableHead>Reason</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
              <TableBody>
                {refunds.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.order.orderNumber}</TableCell>
                    <TableCell>{formatCurrency(Number(r.amount))}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.reason}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
