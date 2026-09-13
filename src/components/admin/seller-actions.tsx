"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { approveSellerAction, rejectSellerAction, suspendSellerAction, reactivateSellerAction } from "@/features/admin/actions";
import type { SellerStatus } from "@/generated/prisma/client";

export function SellerActions({ sellerId, status }: { sellerId: string; status: SellerStatus }) {
  const [isPending, startTransition] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <div className="flex flex-wrap gap-2">
      {status === "PENDING" && (
        <>
          <Button size="sm" disabled={isPending} onClick={() => startTransition(async () => {
            const result = await approveSellerAction(sellerId);
            if (!result.success) toast.error(result.message);
            else toast.success("Seller approved");
          })}>
            {isPending && <Loader2 className="animate-spin" />} Approve
          </Button>
          <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
            <DialogTrigger asChild><Button size="sm" variant="outline">Reject</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Reject Seller Application</DialogTitle></DialogHeader>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for rejection (required)" rows={3} />
              <DialogFooter>
                <Button
                  disabled={isPending || !reason.trim()}
                  onClick={() => startTransition(async () => {
                    const result = await rejectSellerAction(sellerId, reason);
                    if (!result.success) toast.error(result.message);
                    else { toast.success("Seller rejected"); setRejectOpen(false); }
                  })}
                >
                  Confirm Rejection
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
      {status === "APPROVED" && (
        <ConfirmDialog
          trigger={<Button size="sm" variant="destructive">Suspend</Button>}
          title="Suspend this seller?"
          description="Their store and products will be hidden from the marketplace."
          onConfirm={() => startTransition(async () => {
            const result = await suspendSellerAction(sellerId, "Suspended by admin");
            if (!result.success) toast.error(result.message);
          })}
        />
      )}
      {status === "SUSPENDED" && (
        <Button size="sm" disabled={isPending} onClick={() => startTransition(async () => {
          const result = await reactivateSellerAction(sellerId);
          if (!result.success) toast.error(result.message);
        })}>
          Reactivate
        </Button>
      )}
    </div>
  );
}
