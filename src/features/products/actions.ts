"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { requireApprovedSeller } from "@/lib/rbac";
import { generateUniqueSlug } from "@/lib/slug";
import { productFormSchema } from "@/validations/product";
import { getImageService, validateImageFile, ImageValidationError } from "@/services/image";
import type { ActionResult } from "@/features/auth/actions";

export type UploadImageResult = { success: true; url: string } | { success: false; message: string };

export async function uploadProductImage(formData: FormData): Promise<UploadImageResult> {
  const seller = await requireApprovedSeller();
  const file = formData.get("file");
  if (!(file instanceof File)) return { success: false, message: "No file provided" };

  try {
    validateImageFile({ type: file.type, size: file.size });
  } catch (error) {
    if (error instanceof ImageValidationError) return { success: false, message: error.message };
    throw error;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await getImageService().upload(buffer, {
    folder: `sellers/${seller.sellerId}/products`,
    filename: file.name,
    contentType: file.type,
  });

  return { success: true, url: uploaded.url };
}

async function upsertTags(tx: Prisma.TransactionClient, tagNames: string[]) {
  const ids: string[] = [];
  for (const raw of tagNames) {
    const name = raw.trim();
    if (!name) continue;
    const slug = name.toLowerCase().replace(/\s+/g, "-");
    const tag = await tx.tag.upsert({ where: { slug }, update: {}, create: { name, slug } });
    ids.push(tag.id);
  }
  return ids;
}

export async function createProduct(formData: unknown): Promise<ActionResult & { productId?: string }> {
  const seller = await requireApprovedSeller();
  const parsed = productFormSchema.safeParse(formData);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid product data" };
  const data = parsed.data;

  const existingSku = await prisma.product.findUnique({ where: { sku: data.sku } });
  if (existingSku) return { success: false, message: `SKU "${data.sku}" is already in use` };

  const store = await prisma.store.findUnique({ where: { sellerId: seller.sellerId } });
  if (!store) return { success: false, message: "Store not found" };

  const slug = await generateUniqueSlug(data.name, async (candidate) => {
    const found = await prisma.product.findUnique({ where: { slug: candidate } });
    return !!found;
  });

  const productId = await prisma.$transaction(async (tx) => {
    const tagIds = await upsertTags(tx, data.tags);

    const product = await tx.product.create({
      data: {
        sellerId: seller.sellerId,
        storeId: store.id,
        categoryId: data.categoryId,
        brandId: data.brandId || null,
        name: data.name,
        slug,
        sku: data.sku,
        description: data.description,
        shortDescription: data.shortDescription || null,
        price: data.price,
        compareAtPrice: data.compareAtPrice,
        costPrice: data.costPrice,
        lowStockThreshold: data.lowStockThreshold,
        weight: data.weight,
        dimensions: data.dimensions,
        warranty: data.warranty || null,
        returnPolicy: data.returnPolicy || null,
        shippingInfo: data.shippingInfo || null,
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
        isFeatured: data.isFeatured,
        status: "PENDING_REVIEW",
        isPublished: false,
        images: { create: data.images.map((img, i) => ({ url: img.url, altText: img.altText, isPrimary: i === 0 || img.isPrimary, sortOrder: i })) },
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
      },
    });

    if (data.hasVariants && data.variants.length > 0) {
      for (const variant of data.variants) {
        const createdVariant = await tx.productVariant.create({
          data: {
            productId: product.id,
            sku: variant.sku,
            name: variant.name,
            options: variant.options,
            price: variant.price,
            imageUrl: variant.imageUrl,
            weight: variant.weight,
          },
        });
        await tx.inventory.create({ data: { productId: product.id, variantId: createdVariant.id, stock: variant.stock } });
      }
    } else {
      await tx.inventory.create({ data: { productId: product.id, stock: data.stock } });
    }

    return product.id;
  });

  revalidatePath("/seller/products");
  return { success: true, productId };
}

export async function updateProduct(productId: string, formData: unknown): Promise<ActionResult> {
  const seller = await requireApprovedSeller();
  const parsed = productFormSchema.safeParse(formData);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid product data" };
  const data = parsed.data;

  const product = await prisma.product.findFirst({ where: { id: productId, sellerId: seller.sellerId } });
  if (!product) return { success: false, message: "Product not found" };

  const skuOwner = await prisma.product.findUnique({ where: { sku: data.sku } });
  if (skuOwner && skuOwner.id !== productId) return { success: false, message: `SKU "${data.sku}" is already in use` };

  await prisma.$transaction(async (tx) => {
    const tagIds = await upsertTags(tx, data.tags);

    await tx.product.update({
      where: { id: productId },
      data: {
        categoryId: data.categoryId,
        brandId: data.brandId || null,
        name: data.name,
        sku: data.sku,
        description: data.description,
        shortDescription: data.shortDescription || null,
        price: data.price,
        compareAtPrice: data.compareAtPrice,
        costPrice: data.costPrice,
        lowStockThreshold: data.lowStockThreshold,
        weight: data.weight,
        dimensions: data.dimensions,
        warranty: data.warranty || null,
        returnPolicy: data.returnPolicy || null,
        shippingInfo: data.shippingInfo || null,
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
        isFeatured: data.isFeatured,
        // Editing a live product sends it back for re-review — the
        // previous approved version stays visible (isPublished untouched)
        // until the new one is approved or rejected.
        status: product.status === "APPROVED" ? "PENDING_REVIEW" : product.status,
      },
    });

    await tx.productTag.deleteMany({ where: { productId } });
    await tx.productTag.createMany({ data: tagIds.map((tagId) => ({ productId, tagId })) });

    await tx.productImage.deleteMany({ where: { productId } });
    await tx.productImage.createMany({
      data: data.images.map((img, i) => ({ productId, url: img.url, altText: img.altText, isPrimary: i === 0 || img.isPrimary, sortOrder: i })),
    });

    if (!data.hasVariants) {
      await tx.inventory.updateMany({ where: { productId, variantId: null }, data: { stock: data.stock } });
    }
  });

  revalidatePath("/seller/products");
  revalidatePath(`/seller/products/${productId}`);
  return { success: true };
}

export async function deleteProduct(productId: string): Promise<ActionResult> {
  const seller = await requireApprovedSeller();
  const product = await prisma.product.findFirst({ where: { id: productId, sellerId: seller.sellerId } });
  if (!product) return { success: false, message: "Product not found" };

  const orderCount = await prisma.orderItem.count({ where: { productId } });
  if (orderCount > 0) {
    // Preserve order history — archive instead of hard-deleting a product that's been sold.
    await prisma.product.update({ where: { id: productId }, data: { status: "ARCHIVED", isPublished: false } });
  } else {
    await prisma.product.delete({ where: { id: productId } });
  }

  revalidatePath("/seller/products");
  return { success: true };
}

export async function togglePublishProduct(productId: string): Promise<ActionResult> {
  const seller = await requireApprovedSeller();
  const product = await prisma.product.findFirst({ where: { id: productId, sellerId: seller.sellerId } });
  if (!product) return { success: false, message: "Product not found" };
  if (product.status !== "APPROVED") return { success: false, message: "Only approved products can be published/unpublished" };

  await prisma.product.update({ where: { id: productId }, data: { isPublished: !product.isPublished } });
  revalidatePath("/seller/products");
  return { success: true };
}

export async function duplicateProduct(productId: string): Promise<ActionResult & { productId?: string }> {
  const seller = await requireApprovedSeller();
  const product = await prisma.product.findFirst({
    where: { id: productId, sellerId: seller.sellerId },
    include: { images: true, tags: true, variants: { include: { inventory: true } } },
  });
  if (!product) return { success: false, message: "Product not found" };

  const slug = await generateUniqueSlug(`${product.name}-copy`, async (candidate) => {
    const found = await prisma.product.findUnique({ where: { slug: candidate } });
    return !!found;
  });

  const newId = await prisma.$transaction(async (tx) => {
    const copy = await tx.product.create({
      data: {
        sellerId: product.sellerId,
        storeId: product.storeId,
        categoryId: product.categoryId,
        brandId: product.brandId,
        name: `${product.name} (Copy)`,
        slug,
        sku: `${product.sku}-COPY-${Date.now().toString(36).toUpperCase()}`,
        description: product.description,
        shortDescription: product.shortDescription,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        costPrice: product.costPrice,
        lowStockThreshold: product.lowStockThreshold,
        weight: product.weight,
        dimensions: product.dimensions ?? undefined,
        warranty: product.warranty,
        returnPolicy: product.returnPolicy,
        shippingInfo: product.shippingInfo,
        status: "DRAFT",
        isPublished: false,
        images: { create: product.images.map((img) => ({ url: img.url, altText: img.altText, isPrimary: img.isPrimary, sortOrder: img.sortOrder })) },
        tags: { create: product.tags.map((t) => ({ tagId: t.tagId })) },
      },
    });

    if (product.variants.length > 0) {
      for (const v of product.variants) {
        const newVariant = await tx.productVariant.create({
          data: { productId: copy.id, sku: `${v.sku}-COPY-${Date.now().toString(36).toUpperCase()}`, name: v.name, options: v.options as Prisma.InputJsonValue, price: v.price, weight: v.weight },
        });
        await tx.inventory.create({ data: { productId: copy.id, variantId: newVariant.id, stock: v.inventory?.stock ?? 0 } });
      }
    } else {
      await tx.inventory.create({ data: { productId: copy.id, stock: 0 } });
    }

    return copy.id;
  });

  revalidatePath("/seller/products");
  return { success: true, productId: newId };
}
