import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/currency";
import { StatusBadge } from "@/components/shared/status-badge";
import { ProductModerationActions } from "@/components/admin/product-moderation-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Product Review" };

export default async function AdminProductDetailPage({ params }: PageProps<"/admin/products/[id]">) {
  await requireAdmin();
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
      variants: true,
      category: true,
      brand: true,
      seller: { select: { id: true, store: { select: { name: true, slug: true } } } },
    },
  });
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{product.name}</h2>
          <p className="text-sm text-muted-foreground">
            Sold by <Link href={`/admin/sellers/${product.seller.id}`} className="hover:text-primary">{product.seller.store?.name}</Link> · SKU {product.sku}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={product.status} />
          <ProductModerationActions productId={product.id} status={product.status} />
        </div>
      </div>

      {product.rejectionReason && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">Previous rejection reason: {product.rejectionReason}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Images ({product.images.length})</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-3 gap-2">
            {product.images.map((img) => (
              <div key={img.id} className="relative aspect-square overflow-hidden rounded-md border">
                <Image src={img.url} alt={product.name} fill className="object-cover" sizes="200px" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Category:</span> {product.category.name}</p>
            <p><span className="text-muted-foreground">Brand:</span> {product.brand?.name ?? "-"}</p>
            <p><span className="text-muted-foreground">Price:</span> {formatCurrency(Number(product.price))}</p>
            {product.compareAtPrice && <p><span className="text-muted-foreground">Compare-at:</span> {formatCurrency(Number(product.compareAtPrice))}</p>}
            <p><span className="text-muted-foreground">Variants:</span> {product.variants.length}</p>
            <div className="pt-2">
              <p className="text-muted-foreground">Description:</p>
              <p className="whitespace-pre-line">{product.description}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
