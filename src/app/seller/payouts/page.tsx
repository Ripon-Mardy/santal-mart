import type { Metadata } from "next";

import { requireApprovedSeller } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { toNumber, formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { RequestPayoutForm } from "@/components/seller/request-payout-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Wallet, TrendingUp, Clock, Banknote, Download } from "lucide-react";

export const metadata: Metadata = { title: "Earnings & Payouts" };

export default async function SellerPayoutsPage() {
  const seller = await requireApprovedSeller();
  const [wallet, payouts] = await Promise.all([
    prisma.wallet.findUnique({ where: { sellerId: seller.sellerId } }),
    prisma.payout.findMany({ where: { sellerId: seller.sellerId }, orderBy: { requestedAt: "desc" } }),
  ]);

  const availableBalance = toNumber(wallet?.balance ?? 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Earned" value={formatCurrency(toNumber(wallet?.totalEarned ?? 0))} icon={TrendingUp} />
        <StatCard label="Available Balance" value={formatCurrency(availableBalance)} icon={Wallet} />
        <StatCard label="Pending Balance" value={formatCurrency(toNumber(wallet?.pendingBalance ?? 0))} icon={Clock} />
        <StatCard label="Total Paid Out" value={formatCurrency(toNumber(wallet?.totalPaidOut ?? 0))} icon={Banknote} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Request a Payout</CardTitle></CardHeader>
        <CardContent>
          <RequestPayoutForm availableBalance={availableBalance} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Payout History</CardTitle>
          <Button asChild variant="outline" size="sm"><a href="/api/seller/export/payouts"><Download /> Export CSV</a></Button>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <EmptyState title="No payouts yet" description="Your payout requests will appear here." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatCurrency(toNumber(p.amount))}</TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(p.requestedAt)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.paidAt ? formatDate(p.paidAt) : "-"}</TableCell>
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
