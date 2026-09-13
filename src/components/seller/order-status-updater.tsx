"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { updateSellerOrderStatusAction } from "@/features/seller/actions";
import type { OrderStatus } from "@/generated/prisma/client";

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING: "CONFIRMED",
  CONFIRMED: "PROCESSING",
  PROCESSING: "PACKED",
  PACKED: "SHIPPED",
  SHIPPED: "OUT_FOR_DELIVERY",
  OUT_FOR_DELIVERY: "DELIVERED",
};

const CANCELLABLE_FROM: OrderStatus[] = ["PENDING", "CONFIRMED", "PROCESSING", "PACKED"];

export function OrderStatusUpdater({ sellerOrderId, status }: { sellerOrderId: string; status: OrderStatus }) {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const [isPending, startTransition] = useTransition();

  const next = NEXT_STATUS[status];

  function advance() {
    startTransition(async () => {
      const result = await updateSellerOrderStatusAction(sellerOrderId, next!, {
        trackingNumber: trackingNumber || undefined,
        shippingCarrier: carrier || undefined,
      });
      if (!result.success) toast.error(result.message);
      else toast.success(`Order moved to ${next}`);
    });
  }

  if (!next && !CANCELLABLE_FROM.includes(status)) {
    return <p className="text-sm text-muted-foreground">No further actions available for this order.</p>;
  }

  return (
    <div className="space-y-3">
      {status === "PROCESSING" && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="mb-1 text-xs">Tracking Number</Label>
            <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="TRK123456" />
          </div>
          <div>
            <Label className="mb-1 text-xs">Carrier</Label>
            <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Pathao Courier" />
          </div>
        </div>
      )}
      <div className="flex gap-2">
        {next && (
          <Button onClick={advance} disabled={isPending}>
            {isPending && <Loader2 className="animate-spin" />} Mark as {next.replace(/_/g, " ")}
          </Button>
        )}
        {CANCELLABLE_FROM.includes(status) && (
          <ConfirmDialog
            trigger={<Button variant="outline" disabled={isPending}>Cancel Order</Button>}
            title="Cancel this order?"
            description="This will restock inventory and reverse the pending earnings for this order."
            onConfirm={() =>
              startTransition(async () => {
                const result = await updateSellerOrderStatusAction(sellerOrderId, "CANCELLED", { cancelReason: "Cancelled by seller" });
                if (!result.success) toast.error(result.message);
              })
            }
          />
        )}
      </div>
    </div>
  );
}
