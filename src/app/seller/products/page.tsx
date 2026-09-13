import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Download, Package, Plus } from "lucide-react";

import { requireApprovedSeller } from "@/lib/rbac";
import { getSellerProducts } from "@/features/seller/product-queries";
import { formatCurrency } from "@/lib/currency";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProductRowActions } from "@/components/seller/product-row-actions";

export const metadata: Metadata = { title: "My Products" };

export default async function SellerProductsPage({ searchParams }: PageProps<"/seller/products">) {
  const seller = await requireApprovedSeller();
  const sp = await searchParams;
  const params = new URLSearchParams(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : (v ?? "")]));
  const result = await getSellerProducts(seller.sellerId, params);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{result.total} products</p>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm"><a href="/api/seller/export/products"><Download /> Export CSV</a></Button>
          <Button asChild size="sm"><Link href="/seller/products/new"><Plus /> Add Product</Link></Button>
        </div>
      </div>

      {result.items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Create your first product to start selling."
          action={<Button asChild><Link href="/seller/products/new">Add Product</Link></Button>}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((product) => {
                const stock = product.inventory.reduce((s, i) => s + Math.max(0, i.stock - i.reserved), 0);
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                          {product.images[0] && <Image src={product.images[0].url} alt={product.name} fill className="object-cover" sizes="40px" />}
                        </div>
                        <div className="min-w-0">
                          <Link href={`/seller/products/${product.id}`} className="line-clamp-1 font-medium hover:text-primary">{product.name}</Link>
                          <p className="text-xs text-muted-foreground">{product.sku}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{product.category.name}</TableCell>
                    <TableCell className="text-sm">{formatCurrency(Number(product.price))}</TableCell>
                    <TableCell className={`text-sm ${stock <= product.lowStockThreshold ? "text-amber-600 font-medium" : ""}`}>{stock}</TableCell>
                    <TableCell><StatusBadge status={product.status} /></TableCell>
                    <TableCell>
                      <ProductRowActions productId={product.id} isPublished={product.isPublished} canPublish={product.status === "APPROVED"} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex justify-center">
        <PaginationBar page={result.page} totalPages={result.totalPages} basePath="/seller/products" />
      </div>
    </div>
  );
}
