import type { Metadata } from "next";
import { Boxes } from "lucide-react";

import { requireApprovedSeller } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { InventoryAdjustDialog } from "@/components/seller/inventory-adjust-dialog";

export const metadata: Metadata = { title: "Inventory" };

export default async function SellerInventoryPage() {
  const seller = await requireApprovedSeller();

  const inventory = await prisma.inventory.findMany({
    where: { product: { sellerId: seller.sellerId } },
    include: { product: { select: { name: true, sku: true, lowStockThreshold: true } }, variant: { select: { name: true, sku: true } } },
    orderBy: { updatedAt: "desc" },
  });

  if (inventory.length === 0) {
    return <EmptyState icon={Boxes} title="No inventory yet" description="Add products to start tracking inventory." />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Reserved</TableHead>
            <TableHead>Available</TableHead>
            <TableHead>Sold</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {inventory.map((inv) => {
            const available = inv.stock - inv.reserved;
            const low = available <= inv.product.lowStockThreshold;
            return (
              <TableRow key={inv.id}>
                <TableCell className="font-medium">{inv.product.name}{inv.variant && <span className="text-muted-foreground"> — {inv.variant.name}</span>}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{inv.variant?.sku ?? inv.product.sku}</TableCell>
                <TableCell>{inv.stock}</TableCell>
                <TableCell>{inv.reserved}</TableCell>
                <TableCell className={low ? "font-medium text-amber-600" : ""}>{available}</TableCell>
                <TableCell>{inv.sold}</TableCell>
                <TableCell>
                  {available <= 0 ? <Badge variant="destructive">Out of stock</Badge> : low ? <Badge className="bg-amber-100 text-amber-800">Low stock</Badge> : <Badge variant="outline">In stock</Badge>}
                </TableCell>
                <TableCell><InventoryAdjustDialog productId={inv.productId} variantId={inv.variantId} /></TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
