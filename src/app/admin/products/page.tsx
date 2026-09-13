import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Package } from "lucide-react";

import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { parsePagination, paginate } from "@/lib/pagination";
import { formatCurrency } from "@/lib/currency";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProductModerationActions } from "@/components/admin/product-moderation-actions";

export const metadata: Metadata = { title: "Products" };

const STATUS_TABS = ["", "PENDING_REVIEW", "APPROVED", "REJECTED", "DRAFT", "ARCHIVED"];

export default async function AdminProductsPage({ searchParams }: PageProps<"/admin/products">) {
  await requireAdmin();
  const sp = await searchParams;
  const params = new URLSearchParams(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : (v ?? "")]));
  const { page, skip, take } = parsePagination(params);
  const status = params.get("status");
  const sellerId = params.get("sellerId");

  const where = { ...(status ? { status: status as never } : {}), ...(sellerId ? { sellerId } : {}) };
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: { images: { take: 1, orderBy: [{ isPrimary: "desc" }] }, seller: { select: { store: { select: { name: true } } } } },
    }),
    prisma.product.count({ where }),
  ]);
  const result = paginate(products, total, page, take);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto">
        {STATUS_TABS.map((s) => (
          <Link key={s} href={s ? `/admin/products?status=${s}` : "/admin/products"} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${status === s || (!status && !s) ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"}`}>
            {s ? s.replace(/_/g, " ") : "All"}
          </Link>
        ))}
      </div>

      {result.items.length === 0 ? (
        <EmptyState icon={Package} title="No products found" />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                        {product.images[0] && <Image src={product.images[0].url} alt={product.name} fill className="object-cover" sizes="40px" />}
                      </div>
                      <Link href={`/admin/products/${product.id}`} className="line-clamp-1 font-medium hover:text-primary">{product.name}</Link>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{product.seller.store?.name}</TableCell>
                  <TableCell className="text-sm">{formatCurrency(Number(product.price))}</TableCell>
                  <TableCell><StatusBadge status={product.status} /></TableCell>
                  <TableCell><ProductModerationActions productId={product.id} status={product.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <div className="flex justify-center"><PaginationBar page={result.page} totalPages={result.totalPages} basePath="/admin/products" /></div>
    </div>
  );
}
