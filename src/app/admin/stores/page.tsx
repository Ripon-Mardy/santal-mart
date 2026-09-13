import type { Metadata } from "next";
import Link from "next/link";
import { Store } from "lucide-react";

import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Stores" };

export default async function AdminStoresPage() {
  await requireAdmin();
  const stores = await prisma.store.findMany({
    orderBy: { createdAt: "desc" },
    include: { seller: { select: { id: true, status: true } }, _count: { select: { products: true, follows: true } } },
  });

  if (stores.length === 0) return <EmptyState icon={Store} title="No stores yet" />;

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <Table>
        <TableHeader><TableRow><TableHead>Store</TableHead><TableHead>Products</TableHead><TableHead>Followers</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>
          {stores.map((store) => (
            <TableRow key={store.id}>
              <TableCell>
                <Link href={`/admin/sellers/${store.seller.id}`} className="font-medium hover:text-primary">{store.name}</Link>
                <p className="text-xs text-muted-foreground"><Link href={`/stores/${store.slug}`} className="hover:underline">/stores/{store.slug}</Link></p>
              </TableCell>
              <TableCell className="text-sm">{store._count.products}</TableCell>
              <TableCell className="text-sm">{store._count.follows}</TableCell>
              <TableCell><StatusBadge status={store.seller.status} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
