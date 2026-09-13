import Image from "next/image";

import { Rating } from "@/components/shared/rating";
import { EmptyState } from "@/components/shared/empty-state";
import { WriteReviewDialog } from "@/components/product/write-review-dialog";
import { formatDate } from "@/lib/format";
import { MessageSquare } from "lucide-react";

type Review = {
  id: string;
  rating: number;
  title: string | null;
  comment: string;
  createdAt: Date;
  sellerReply: string | null;
  user: { name: string; avatarUrl: string | null };
  images: { url: string }[];
};

export function ReviewsSection({
  avgRating,
  reviews,
  total,
  ratingBreakdown,
  eligibleItems,
}: {
  avgRating: number;
  reviews: Review[];
  total: number;
  ratingBreakdown: { rating: number; _count: number }[];
  eligibleItems: { id: string; sku: string; variantName: string | null; order: { orderNumber: string } }[];
}) {
  const breakdownMap = new Map(ratingBreakdown.map((r) => [r.rating, r._count]));

  return (
    <div id="reviews" className="space-y-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="flex shrink-0 flex-col items-center gap-1 sm:w-40">
          <p className="text-4xl font-bold">{avgRating.toFixed(1)}</p>
          <Rating value={avgRating} />
          <p className="text-sm text-muted-foreground">{total} reviews</p>
        </div>
        <div className="flex-1 space-y-1">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = breakdownMap.get(star) ?? 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="w-8 text-muted-foreground">{star} star</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-8 text-right text-muted-foreground">{count}</span>
              </div>
            );
          })}
        </div>
        <WriteReviewDialog eligibleItems={eligibleItems} />
      </div>

      {reviews.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No reviews yet" description="Be the first to review this product after your order is delivered." />
      ) : (
        <div className="space-y-6 divide-y">
          {reviews.map((review) => (
            <div key={review.id} className="pt-6 first:pt-0">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-muted text-sm font-medium">
                  {review.user.name.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">{review.user.name}</p>
                  <div className="flex items-center gap-2">
                    <Rating value={review.rating} size="xs" />
                    <span className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</span>
                  </div>
                </div>
              </div>
              {review.title && <p className="mt-2 text-sm font-semibold">{review.title}</p>}
              <p className="mt-1 text-sm text-muted-foreground">{review.comment}</p>
              {review.images.length > 0 && (
                <div className="mt-2 flex gap-2">
                  {review.images.map((img, i) => (
                    <div key={i} className="relative size-16 overflow-hidden rounded-md border">
                      <Image src={img.url} alt="Review" fill className="object-cover" sizes="64px" />
                    </div>
                  ))}
                </div>
              )}
              {review.sellerReply && (
                <div className="mt-3 rounded-lg bg-muted p-3 text-sm">
                  <p className="font-medium">Seller response</p>
                  <p className="text-muted-foreground">{review.sellerReply}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
