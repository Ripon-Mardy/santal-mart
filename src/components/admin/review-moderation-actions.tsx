"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { moderateReviewAction } from "@/features/reviews/actions";

export function ReviewModerationActions({ reviewId }: { reviewId: string }) {
  const [isPending, startTransition] = useTransition();

  function moderate(status: "APPROVED" | "REJECTED") {
    startTransition(async () => {
      const result = await moderateReviewAction(reviewId, status);
      if (!result.success) toast.error(result.message);
    });
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" disabled={isPending} onClick={() => moderate("APPROVED")}>Approve</Button>
      <Button size="sm" variant="outline" disabled={isPending} onClick={() => moderate("REJECTED")}>Reject</Button>
    </div>
  );
}
