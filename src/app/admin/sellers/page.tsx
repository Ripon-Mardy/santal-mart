import type { Metadata } from "next";
import Link from "next/link";
import { Store } from "lucide-react";

import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { parsePagination, paginate } from "@/lib/pagination";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SellerActions } from "@/components/admin/seller-actions";

export const metadata: Metadata = { title: "Sellers" };

const STATUS_TABS = ["", "PENDING", "APPROVED", "SUSPENDED", "REJECTED"];

export default async function AdminSellersPage({ searchParams }: PageProps<"/admin/sellers">) {
  await requireAdmin();
  const sp = await searchParams;
  const params = new URLSearchParams(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : (v ?? "")]));
  const { page, skip, take } = parsePagination(params);
  const status = params.get("status");

  const where = status ? { status: status as never } : {};
  const [sellers, total] = await Promise.all([
    prisma.seller.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: { user: { select: { name: true, email: true } }, store: { select: { name: true, slug: true, _count: { select: { products: true } } } } },
    }),
    prisma.seller.count({ where }),
  ]);
  const result = paginate(sellers, total, page, take);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto">
        {STATUS_TABS.map((s) => (
          <Link key={s} href={s ? `/admin/sellers?status=${s}` : "/admin/sellers"} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${status === s || (!status && !s) ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"}`}>
            {s || "All"}
          </Link>
        ))}
      </div>

      {result.items.length === 0 ? (
        <EmptyState icon={Store} title="No sellers found" />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Store</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((seller) => (
                <TableRow key={seller.id}>
                  <TableCell><Link href={`/admin/sellers/${seller.id}`} className="font-medium hover:text-primary">{seller.store?.name ?? seller.businessName}</Link></TableCell>
                  <TableCell className="text-sm">{seller.user.name}<p className="text-xs text-muted-foreground">{seller.user.email}</p></TableCell>
                  <TableCell className="text-sm">{seller.store?._count.products ?? 0}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(seller.createdAt)}</TableCell>
                  <TableCell><StatusBadge status={seller.status} /></TableCell>
                  <TableCell><SellerActions sellerId={seller.id} status={seller.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <div className="flex justify-center"><PaginationBar page={result.page} totalPages={result.totalPages} basePath="/admin/sellers" /></div>
    </div>
  );
}
