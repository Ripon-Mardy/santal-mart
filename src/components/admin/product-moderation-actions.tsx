"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { approveProductAction, rejectProductAction, archiveProductAction } from "@/features/admin/actions";
import type { ProductStatus } from "@/generated/prisma/client";

export function ProductModerationActions({ productId, status }: { productId: string; status: ProductStatus }) {
  const [isPending, startTransition] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <div className="flex flex-wrap gap-2">
      {(status === "PENDING_REVIEW" || status === "REJECTED") && (
        <Button size="sm" disabled={isPending} onClick={() => startTransition(async () => {
          const result = await approveProductAction(productId);
          if (!result.success) toast.error(result.message);
          else toast.success("Product approved");
        })}>
          {isPending && <Loader2 className="animate-spin" />} Approve
        </Button>
      )}
      {status === "PENDING_REVIEW" && (
        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <DialogTrigger asChild><Button size="sm" variant="outline">Reject</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Reject Product</DialogTitle></DialogHeader>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for rejection (required, shown to seller)" rows={3} />
            <DialogFooter>
              <Button
                disabled={isPending || !reason.trim()}
                onClick={() => startTransition(async () => {
                  const result = await rejectProductAction(productId, reason);
                  if (!result.success) toast.error(result.message);
                  else { toast.success("Product rejected"); setRejectOpen(false); }
                })}
              >
                Confirm Rejection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {status !== "ARCHIVED" && (
        <ConfirmDialog
          trigger={<Button size="sm" variant="destructive">Archive</Button>}
          title="Archive this product?"
          description="It will be removed from the marketplace but order history is preserved."
          onConfirm={() => startTransition(async () => {
            await archiveProductAction(productId);
          })}
        />
      )}
    </div>
  );
}
