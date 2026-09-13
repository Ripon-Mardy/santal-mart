"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { approvePayoutAction, rejectPayoutAction, markPayoutPaidAction } from "@/features/admin/actions";
import type { PayoutStatus } from "@/generated/prisma/client";

export function PayoutActions({ payoutId, status }: { payoutId: string; status: PayoutStatus }) {
  const [isPending, startTransition] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

  if (status === "PENDING") {
    return (
      <div className="flex gap-2">
        <Button size="sm" disabled={isPending} onClick={() => startTransition(async () => {
          const result = await approvePayoutAction(payoutId);
          if (!result.success) toast.error(result.message);
        })}>
          {isPending && <Loader2 className="animate-spin" />} Approve
        </Button>
        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <DialogTrigger asChild><Button size="sm" variant="outline">Reject</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Reject Payout</DialogTitle></DialogHeader>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" rows={3} />
            <DialogFooter>
              <Button disabled={!reason.trim() || isPending} onClick={() => startTransition(async () => {
                const result = await rejectPayoutAction(payoutId, reason);
                if (!result.success) toast.error(result.message);
                else setRejectOpen(false);
              })}>
                Confirm Rejection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (status === "PROCESSING") {
    return (
      <Button size="sm" disabled={isPending} onClick={() => startTransition(async () => {
        const result = await markPayoutPaidAction(payoutId);
        if (!result.success) toast.error(result.message);
      })}>
        {isPending && <Loader2 className="animate-spin" />} Mark as Paid
      </Button>
    );
  }

  return null;
}
