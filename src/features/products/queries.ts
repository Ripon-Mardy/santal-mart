import { prisma } from "@/lib/prisma";

export async function getProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
      variants: { include: { inventory: true }, orderBy: { createdAt: "asc" } },
      inventory: true,
      category: { select: { id: true, name: true, slug: true, parent: { select: { name: true, slug: true } } } },
      brand: { select: { id: true, name: true, slug: true } },
      tags: { include: { tag: true } },
      store: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          followersCount: true,
          seller: { select: { id: true } },
          _count: { select: { products: true } },
        },
      },
    },
  });
}

export async function getProductReviews(productId: string, page = 1, pageSize = 10) {
  const [items, total, ratingBreakdown] = await Promise.all([
    prisma.review.findMany({
      where: { productId, status: "APPROVED" },
      include: { user: { select: { name: true, avatarUrl: true } }, images: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.review.count({ where: { productId, status: "APPROVED" } }),
    prisma.review.groupBy({ by: ["rating"], where: { productId, status: "APPROVED" }, _count: true }),
  ]);

  return { items, total, ratingBreakdown };
}

export async function getSellerRatingSummary(sellerId: string) {
  const agg = await prisma.sellerReview.aggregate({
    where: { sellerId },
    _avg: { productQualityRating: true, deliveryRating: true, serviceRating: true },
    _count: true,
  });
  const overall =
    ((agg._avg.productQualityRating ?? 0) + (agg._avg.deliveryRating ?? 0) + (agg._avg.serviceRating ?? 0)) / 3 || 0;
  return { overall, count: agg._count };
}

/** Returns eligible order items the user can review for this product (delivered, not yet reviewed). */
export async function getReviewableOrderItems(userId: string, productId: string) {
  return prisma.orderItem.findMany({
    where: {
      productId,
      order: { userId },
      sellerOrder: { status: "DELIVERED" },
      review: null,
    },
    select: { id: true, sku: true, variantName: true, order: { select: { orderNumber: true, placedAt: true } } },
  });
}
