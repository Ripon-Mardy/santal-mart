import type { Metadata } from "next";

import { requireApprovedSeller } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/seller/product-form";

export const metadata: Metadata = { title: "Add Product" };

export default async function NewProductPage() {
  await requireApprovedSeller();

  const [categories, brands] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true, children: { none: {} } }, orderBy: { name: "asc" }, include: { parent: { select: { name: true } } } }),
    prisma.brand.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-lg font-semibold">Add New Product</h1>
      <p className="mb-6 text-sm text-muted-foreground">Fill in the details below. New products require admin approval before going live.</p>
      <ProductForm
        categories={categories.map((c) => ({ id: c.id, name: c.name, parentName: c.parent?.name }))}
        brands={brands}
      />
    </div>
  );
}
