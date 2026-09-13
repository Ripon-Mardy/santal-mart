import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireApprovedSeller } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getSellerProductForEdit } from "@/features/seller/product-queries";
import { toNumber } from "@/lib/currency";
import { ProductForm } from "@/components/seller/product-form";
import { StatusBadge } from "@/components/shared/status-badge";

export const metadata: Metadata = { title: "Edit Product" };

export default async function EditProductPage({ params }: PageProps<"/seller/products/[id]">) {
  const seller = await requireApprovedSeller();
  const { id } = await params;

  const [product, categories, brands] = await Promise.all([
    getSellerProductForEdit(seller.sellerId, id),
    prisma.category.findMany({ where: { isActive: true, children: { none: {} } }, orderBy: { name: "asc" }, include: { parent: { select: { name: true } } } }),
    prisma.brand.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  if (!product) notFound();

  const baseInventory = product.inventory.find((i) => i.variantId === null);

  return (
    <div className="max-w-3xl">
      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-lg font-semibold">Edit Product</h1>
        <StatusBadge status={product.status} />
      </div>
      {product.rejectionReason && (
        <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          Rejected: {product.rejectionReason}
        </p>
      )}
      <ProductForm
        productId={product.id}
        categories={categories.map((c) => ({ id: c.id, name: c.name, parentName: c.parent?.name }))}
        brands={brands}
        defaultValues={{
          name: product.name,
          categoryId: product.categoryId,
          brandId: product.brandId ?? "",
          description: product.description,
          shortDescription: product.shortDescription ?? "",
          tags: product.tags.map((t) => t.tag.name),
          images: product.images.map((img) => ({ url: img.url, altText: img.altText ?? undefined, isPrimary: img.isPrimary })),
          price: toNumber(product.price),
          compareAtPrice: product.compareAtPrice ? toNumber(product.compareAtPrice) : undefined,
          costPrice: product.costPrice ? toNumber(product.costPrice) : undefined,
          sku: product.sku,
          stock: baseInventory?.stock ?? 0,
          lowStockThreshold: product.lowStockThreshold,
          hasVariants: product.variants.length > 0,
          variants: product.variants.map((v) => ({
            id: v.id,
            sku: v.sku,
            name: v.name,
            options: (v.options as Record<string, string>) ?? {},
            price: v.price ? toNumber(v.price) : undefined,
            stock: v.inventory?.stock ?? 0,
          })),
          weight: product.weight ? toNumber(product.weight) : undefined,
          warranty: product.warranty ?? "",
          returnPolicy: product.returnPolicy ?? "",
          shippingInfo: product.shippingInfo ?? "",
          seoTitle: product.seoTitle ?? "",
          seoDescription: product.seoDescription ?? "",
          isFeatured: product.isFeatured,
        }}
      />
    </div>
  );
}
