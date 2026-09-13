"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { replyToReviewAction } from "@/features/reviews/actions";

export function ReviewReplyForm({ reviewId }: { reviewId: string }) {
  const [reply, setReply] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="mt-2 flex gap-2">
      <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a response to this review..." rows={2} className="flex-1" />
      <Button
        size="sm"
        disabled={isPending || reply.trim().length === 0}
        onClick={() =>
          startTransition(async () => {
            const result = await replyToReviewAction(reviewId, reply);
            if (result.success) { toast.success("Reply posted"); setReply(""); }
            else toast.error(result.message);
          })
        }
      >
        {isPending && <Loader2 className="animate-spin" />} Reply
      </Button>
    </div>
  );
}
