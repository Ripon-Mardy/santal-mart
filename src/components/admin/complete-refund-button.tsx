"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { adminCompleteReturnRefundAction } from "@/features/admin/actions";

export function CompleteRefundButton({ returnRequestId }: { returnRequestId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await adminCompleteReturnRefundAction(returnRequestId);
          if (!result.success) toast.error(result.message);
          else toast.success("Refund processed");
        })
      }
    >
      Complete Refund
    </Button>
  );
}
