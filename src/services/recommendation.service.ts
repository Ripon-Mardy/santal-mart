import "server-only";

import { prisma } from "@/lib/prisma";
import { PRODUCT_CARD_SELECT } from "@/services/search.service";

/**
 * Rule-based recommendations (same category/brand + popularity signals).
 * Isolated behind this module so a real ML-based recommender can replace
 * it later without callers changing — every function here keeps the same
 * ProductCard-shaped return value.
 */

export async function getRelatedProducts(productId: string, take = 8) {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { categoryId: true, brandId: true } });
  if (!product) return [];

  return prisma.product.findMany({
    where: {
      id: { not: productId },
      status: "APPROVED",
      isPublished: true,
      OR: [{ categoryId: product.categoryId }, ...(product.brandId ? [{ brandId: product.brandId }] : [])],
    },
    select: PRODUCT_CARD_SELECT,
    orderBy: [{ soldCount: "desc" }, { avgRating: "desc" }],
    take,
  });
}

export async function getFrequentlyBoughtTogether(productId: string, take = 4) {
  const coOccurring = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: {
      productId: { not: productId },
      order: { items: { some: { productId } } },
    },
    _count: { productId: true },
    orderBy: { _count: { productId: "desc" } },
    take,
  });

  if (coOccurring.length === 0) return getRelatedProducts(productId, take);

  return prisma.product.findMany({
    where: { id: { in: coOccurring.map((c) => c.productId) }, status: "APPROVED", isPublished: true },
    select: PRODUCT_CARD_SELECT,
  });
}

export async function getRecommendedForUser(userId: string | null, take = 12) {
  if (!userId) {
    return prisma.product.findMany({
      where: { status: "APPROVED", isPublished: true },
      select: PRODUCT_CARD_SELECT,
      orderBy: [{ soldCount: "desc" }],
      take,
    });
  }

  const recentViews = await prisma.recentlyViewed.findMany({
    where: { userId },
    orderBy: { viewedAt: "desc" },
    take: 5,
    select: { product: { select: { categoryId: true, brandId: true } } },
  });

  const categoryIds = [...new Set(recentViews.map((v) => v.product.categoryId))];

  if (categoryIds.length === 0) {
    return prisma.product.findMany({
      where: { status: "APPROVED", isPublished: true },
      select: PRODUCT_CARD_SELECT,
      orderBy: [{ soldCount: "desc" }],
      take,
    });
  }

  return prisma.product.findMany({
    where: { status: "APPROVED", isPublished: true, categoryId: { in: categoryIds } },
    select: PRODUCT_CARD_SELECT,
    orderBy: [{ avgRating: "desc" }, { soldCount: "desc" }],
    take,
  });
}

export async function trackRecentlyViewed(userId: string, productId: string) {
  await prisma.recentlyViewed.upsert({
    where: { userId_productId: { userId, productId } },
    update: { viewedAt: new Date() },
    create: { userId, productId },
  });

  const count = await prisma.recentlyViewed.count({ where: { userId } });
  if (count > 20) {
    const stale = await prisma.recentlyViewed.findMany({
      where: { userId },
      orderBy: { viewedAt: "asc" },
      take: count - 20,
      select: { id: true },
    });
    await prisma.recentlyViewed.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
  }
}
