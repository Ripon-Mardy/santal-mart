"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { adminRefundOrderAction } from "@/features/admin/actions";

export function RefundOrderDialog({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="destructive" size="sm">Refund Order</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Refund This Order</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">This refunds the full order amount and deducts it from the seller(s)&apos; wallet balance.</p>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for refund" rows={3} />
        <DialogFooter>
          <Button
            variant="destructive"
            disabled={isPending || !reason.trim()}
            onClick={() =>
              startTransition(async () => {
                const result = await adminRefundOrderAction(orderId, reason);
                if (!result.success) toast.error(result.message);
                else { toast.success("Order refunded"); setOpen(false); }
              })
            }
          >
            {isPending && <Loader2 className="animate-spin" />} Confirm Refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
