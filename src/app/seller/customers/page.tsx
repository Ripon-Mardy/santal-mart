import type { Metadata } from "next";
import { Users } from "lucide-react";

import { requireApprovedSeller } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { formatCurrency, toNumber } from "@/lib/currency";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Customers" };

export default async function SellerCustomersPage() {
  const seller = await requireApprovedSeller();

  const sellerOrders = await prisma.sellerOrder.findMany({
    where: { sellerId: seller.sellerId, status: { not: "CANCELLED" } },
    select: { subtotal: true, createdAt: true, order: { select: { userId: true, user: { select: { name: true, email: true } } } } },
  });

  const byCustomer = new Map<string, { name: string; email: string; orders: number; spent: number; lastOrder: Date }>();
  for (const so of sellerOrders) {
    const userId = so.order.userId;
    const entry = byCustomer.get(userId) ?? { name: so.order.user.name, email: so.order.user.email, orders: 0, spent: 0, lastOrder: so.createdAt };
    entry.orders += 1;
    entry.spent += toNumber(so.subtotal);
    if (so.createdAt > entry.lastOrder) entry.lastOrder = so.createdAt;
    byCustomer.set(userId, entry);
  }

  const customers = [...byCustomer.values()].sort((a, b) => b.spent - a.spent);

  if (customers.length === 0) {
    return <EmptyState icon={Users} title="No customers yet" description="Customers who order from your store will appear here." />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Orders</TableHead>
            <TableHead>Total Spent</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((c) => (
            <TableRow key={c.email}>
              <TableCell>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.email}</p>
              </TableCell>
              <TableCell>{c.orders}</TableCell>
              <TableCell>{formatCurrency(c.spent)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
