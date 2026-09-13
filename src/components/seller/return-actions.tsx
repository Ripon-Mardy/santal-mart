"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { respondToReturnAction } from "@/features/reviews/actions";

export function SellerReturnActions({ returnRequestId }: { returnRequestId: string }) {
  const [isPending, startTransition] = useTransition();

  function respond(action: "APPROVE" | "REJECT") {
    startTransition(async () => {
      const result = await respondToReturnAction(returnRequestId, action);
      if (!result.success) toast.error(result.message);
    });
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" disabled={isPending} onClick={() => respond("APPROVE")}>Approve</Button>
      <Button size="sm" variant="outline" disabled={isPending} onClick={() => respond("REJECT")}>Reject</Button>
    </div>
  );
}
