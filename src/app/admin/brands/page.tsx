import type { Metadata } from "next";
import Image from "next/image";
import { Tag } from "lucide-react";

import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BrandFormDialog } from "@/components/admin/brand-form-dialog";
import { DeleteEntityButton } from "@/components/shared/delete-entity-button";
import { deleteBrandAction } from "@/features/admin/actions";

export const metadata: Metadata = { title: "Brands" };

export default async function AdminBrandsPage() {
  await requireAdmin();
  const brands = await prisma.brand.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { products: true } } } });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{brands.length} brands</p>
        <BrandFormDialog />
      </div>

      {brands.length === 0 ? (
        <EmptyState icon={Tag} title="No brands yet" />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>Brand</TableHead><TableHead>Products</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {brands.map((brand) => (
                <TableRow key={brand.id}>
                  <TableCell className="flex items-center gap-2 font-medium">
                    {brand.logoUrl && <div className="relative size-6 overflow-hidden rounded-full bg-muted"><Image src={brand.logoUrl} alt={brand.name} fill className="object-cover" sizes="24px" /></div>}
                    {brand.name}
                  </TableCell>
                  <TableCell className="text-sm">{brand._count.products}</TableCell>
                  <TableCell>{brand.isActive ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <BrandFormDialog brand={{ id: brand.id, name: brand.name, description: brand.description ?? "", logoUrl: brand.logoUrl ?? "", isActive: brand.isActive }} />
                      <DeleteEntityButton onDelete={deleteBrandAction.bind(null, brand.id)} entityLabel="brand" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
