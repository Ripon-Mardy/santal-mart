import type { Metadata } from "next";
import Link from "next/link";
import { Star } from "lucide-react";

import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { Rating } from "@/components/shared/rating";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = { title: "My Reviews" };

export default async function MyReviewsPage() {
  const user = await requireUser();
  const reviews = await prisma.review.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { product: { select: { name: true, slug: true } } },
  });

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">My Reviews</h1>
      {reviews.length === 0 ? (
        <EmptyState icon={Star} title="No reviews yet" description="Reviews you write after a delivered order will show up here." />
      ) : (
        <div className="space-y-4 divide-y rounded-xl border bg-card p-4">
          {reviews.map((review) => (
            <div key={review.id} className="pt-4 first:pt-0">
              <div className="flex items-center justify-between">
                <Link href={`/products/${review.product.slug}`} className="text-sm font-medium hover:text-primary">{review.product.name}</Link>
                <StatusBadge status={review.status} />
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Rating value={review.rating} />
                <span className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</span>
              </div>
              {review.title && <p className="mt-1 text-sm font-semibold">{review.title}</p>}
              <p className="text-sm text-muted-foreground">{review.comment}</p>
              {review.sellerReply && (
                <div className="mt-2 rounded-lg bg-muted p-3 text-sm">
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
