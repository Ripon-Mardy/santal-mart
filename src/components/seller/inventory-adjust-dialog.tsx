"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Boxes } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { adjustInventory } from "@/features/seller/actions";

export function InventoryAdjustDialog({ productId, variantId }: { productId: string; variantId: string | null }) {
  const [open, setOpen] = useState(false);
  const [delta, setDelta] = useState(0);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Boxes className="size-3.5" /> Adjust</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Adjust Stock</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="mb-1.5">Quantity Change (use negative to remove)</Label>
            <Input type="number" value={delta} onChange={(e) => setDelta(Number(e.target.value))} />
          </div>
          <div>
            <Label className="mb-1.5">Note (optional)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. New stock delivery" />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={isPending || delta === 0}
            onClick={() =>
              startTransition(async () => {
                const result = await adjustInventory(productId, variantId, delta, note || undefined);
                if (result.success) {
                  toast.success("Inventory updated");
                  setOpen(false);
                  setDelta(0);
                  setNote("");
                } else {
                  toast.error(result.message);
                }
              })
            }
          >
            {isPending && <Loader2 className="animate-spin" />} Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
