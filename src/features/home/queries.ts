import { prisma } from "@/lib/prisma";
import { PRODUCT_CARD_SELECT } from "@/services/search.service";

const APPROVED_PUBLISHED = { status: "APPROVED", isPublished: true } as const;

export async function getActiveBanners(type: "HERO" | "PROMOTIONAL" | "CATEGORY" = "HERO") {
  const now = new Date();
  return prisma.banner.findMany({
    where: {
      type,
      isActive: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getPopularCategories(take = 8) {
  return prisma.category.findMany({
    where: { parentId: null, isActive: true },
    orderBy: { sortOrder: "asc" },
    take,
    select: { id: true, name: true, slug: true, imageUrl: true, _count: { select: { products: true } } },
  });
}

export async function getFlashDeals(take = 10) {
  return prisma.product.findMany({
    where: { ...APPROVED_PUBLISHED, compareAtPrice: { not: null } },
    select: PRODUCT_CARD_SELECT,
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function getFeaturedProducts(take = 10) {
  return prisma.product.findMany({
    where: { ...APPROVED_PUBLISHED, isFeatured: true },
    select: PRODUCT_CARD_SELECT,
    orderBy: { avgRating: "desc" },
    take,
  });
}

export async function getBestSellers(take = 10) {
  return prisma.product.findMany({
    where: { ...APPROVED_PUBLISHED, soldCount: { gt: 0 } },
    select: PRODUCT_CARD_SELECT,
    orderBy: { soldCount: "desc" },
    take,
  });
}

export async function getNewArrivals(take = 10) {
  return prisma.product.findMany({
    where: APPROVED_PUBLISHED,
    select: PRODUCT_CARD_SELECT,
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function getTopStores(take = 6) {
  return prisma.store.findMany({
    orderBy: [{ followersCount: "desc" }],
    take,
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      bannerUrl: true,
      followersCount: true,
      _count: { select: { products: true } },
      seller: { select: { id: true } },
    },
  });
}

export async function getUserWishlistProductIds(userId: string): Promise<Set<string>> {
  const wishlist = await prisma.wishlist.findUnique({ where: { userId }, include: { items: { select: { productId: true } } } });
  return new Set(wishlist?.items.map((i) => i.productId) ?? []);
}

export async function getRecentlyViewedProducts(userId: string, take = 10) {
  const views = await prisma.recentlyViewed.findMany({
    where: { userId },
    orderBy: { viewedAt: "desc" },
    take,
    select: { product: { select: PRODUCT_CARD_SELECT } },
  });
  return views.map((v) => v.product).filter((p) => p !== null);
}
