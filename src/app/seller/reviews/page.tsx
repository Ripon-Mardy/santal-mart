import type { Metadata } from "next";
import { Star } from "lucide-react";

import { requireApprovedSeller } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { parsePagination } from "@/lib/pagination";
import { formatDate } from "@/lib/format";
import { Rating } from "@/components/shared/rating";
import { EmptyState } from "@/components/shared/empty-state";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { ReviewReplyForm } from "@/components/seller/review-reply-form";

export const metadata: Metadata = { title: "Reviews" };

export default async function SellerReviewsPage({ searchParams }: PageProps<"/seller/reviews">) {
  const seller = await requireApprovedSeller();
  const sp = await searchParams;
  const params = new URLSearchParams(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : (v ?? "")]));
  const { page, skip, take } = parsePagination(params);

  const where = { product: { sellerId: seller.sellerId }, status: "APPROVED" as const };
  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: { user: { select: { name: true } }, product: { select: { name: true, slug: true } } },
    }),
    prisma.review.count({ where }),
  ]);

  if (reviews.length === 0) {
    return <EmptyState icon={Star} title="No reviews yet" description="Customer reviews for your products will show up here." />;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4 divide-y rounded-xl border bg-card p-4">
        {reviews.map((review) => (
          <div key={review.id} className="pt-4 first:pt-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{review.product.name}</p>
                <p className="text-xs text-muted-foreground">{review.user.name} · {formatDate(review.createdAt)}</p>
              </div>
              <Rating value={review.rating} />
            </div>
            {review.title && <p className="mt-1 text-sm font-semibold">{review.title}</p>}
            <p className="text-sm text-muted-foreground">{review.comment}</p>
            {review.sellerReply ? (
              <div className="mt-2 rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium">Your response</p>
                <p className="text-muted-foreground">{review.sellerReply}</p>
              </div>
            ) : (
              <ReviewReplyForm reviewId={review.id} />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-center">
        <PaginationBar page={page} totalPages={Math.ceil(total / take)} basePath="/seller/reviews" />
      </div>
    </div>
  );
}
