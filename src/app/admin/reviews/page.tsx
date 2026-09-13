import type { Metadata } from "next";
import Link from "next/link";
import { Star } from "lucide-react";

import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { Rating } from "@/components/shared/rating";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ReviewModerationActions } from "@/components/admin/review-moderation-actions";

export const metadata: Metadata = { title: "Reviews" };

export default async function AdminReviewsPage({ searchParams }: PageProps<"/admin/reviews">) {
  await requireAdmin();
  const sp = await searchParams;
  const status = Array.isArray(sp.status) ? sp.status[0] : (sp.status ?? "PENDING");

  const reviews = await prisma.review.findMany({
    where: { status: status as never },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { name: true } }, product: { select: { name: true, slug: true } } },
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {["PENDING", "APPROVED", "REJECTED"].map((s) => (
          <Link key={s} href={`/admin/reviews?status=${s}`} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${status === s ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"}`}>{s}</Link>
        ))}
      </div>

      {reviews.length === 0 ? (
        <EmptyState icon={Star} title={`No ${status.toLowerCase()} reviews`} />
      ) : (
        <div className="space-y-3 rounded-xl border bg-card p-4 divide-y">
          {reviews.map((review) => (
            <div key={review.id} className="pt-3 first:pt-0">
              <div className="flex items-center justify-between">
                <div>
                  <Link href={`/products/${review.product.slug}`} className="text-sm font-medium hover:text-primary">{review.product.name}</Link>
                  <p className="text-xs text-muted-foreground">{review.user.name} · {formatDate(review.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Rating value={review.rating} />
                  <StatusBadge status={review.status} />
                </div>
              </div>
              {review.title && <p className="mt-1 text-sm font-semibold">{review.title}</p>}
              <p className="text-sm text-muted-foreground">{review.comment}</p>
              {status === "PENDING" && <div className="mt-2"><ReviewModerationActions reviewId={review.id} /></div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
