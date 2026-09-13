import "server-only";

import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/api-response";
import { notifyUser } from "@/services/notification.service";

/** Recomputes a product's avgRating/reviewCount from its approved reviews. Called after any moderation change. */
export async function recalculateProductRating(productId: string) {
  const agg = await prisma.review.aggregate({
    where: { productId, status: "APPROVED" },
    _avg: { rating: true },
    _count: true,
  });
  await prisma.product.update({
    where: { id: productId },
    data: { avgRating: agg._avg.rating ?? 0, reviewCount: agg._count },
  });
}

/** Spec rule §8/§25: only a verified purchase (a delivered order item) can be reviewed, and only once. */
export async function createReview(params: {
  userId: string;
  orderItemId: string;
  rating: number;
  title?: string;
  comment: string;
  images?: string[];
}) {
  const orderItem = await prisma.orderItem.findUnique({
    where: { id: params.orderItemId },
    include: { order: true, sellerOrder: true, review: true },
  });
  if (!orderItem || orderItem.order.userId !== params.userId) {
    throw new AppError("Order item not found", "ORDER_ITEM_NOT_FOUND", 404);
  }
  if (orderItem.sellerOrder.status !== "DELIVERED") {
    throw new AppError("You can only review items after they've been delivered", "NOT_DELIVERED", 400);
  }
  if (orderItem.review) {
    throw new AppError("You've already reviewed this item", "ALREADY_REVIEWED", 400);
  }
  if (params.rating < 1 || params.rating > 5) {
    throw new AppError("Rating must be between 1 and 5", "INVALID_RATING", 400);
  }

  const review = await prisma.review.create({
    data: {
      productId: orderItem.productId,
      userId: params.userId,
      orderItemId: params.orderItemId,
      rating: params.rating,
      title: params.title,
      comment: params.comment,
      images: params.images ? { create: params.images.map((url, i) => ({ url, sortOrder: i })) } : undefined,
    },
  });

  return review;
}

export async function moderateReview(reviewId: string, status: "APPROVED" | "REJECTED") {
  const review = await prisma.review.update({ where: { id: reviewId }, data: { status } });
  await recalculateProductRating(review.productId);
  return review;
}

export async function replyToReview(reviewId: string, sellerUserId: string, reply: string, sellerIdForAuth: string) {
  const review = await prisma.review.findUnique({ where: { id: reviewId }, include: { product: true } });
  if (!review) throw new AppError("Review not found", "REVIEW_NOT_FOUND", 404);
  if (review.product.sellerId !== sellerIdForAuth) throw new AppError("You don't have access to this review", "FORBIDDEN", 403);

  await prisma.review.update({ where: { id: reviewId }, data: { sellerReply: reply, sellerRepliedAt: new Date() } });
  await notifyUser({
    userId: review.userId,
    type: "REVIEW",
    title: "The seller replied to your review",
    message: reply.slice(0, 140),
    link: `/products/${review.productId}`,
  });
}
