"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { submitReturnRequest } from "@/features/reviews/actions";

const REASONS = [
  { value: "WRONG_PRODUCT", label: "Wrong product received" },
  { value: "DAMAGED", label: "Product arrived damaged" },
  { value: "NOT_AS_DESCRIBED", label: "Not as described" },
  { value: "MISSING_ITEM", label: "Missing item(s)" },
  { value: "OTHER", label: "Other" },
] as const;

export function ReturnRequestDialog({ orderItemId }: { orderItemId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number]["value"]>("DAMAGED");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Request Return</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Request a Return</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="mb-1.5">Reason</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as typeof reason)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="return-desc" className="mb-1.5">Details (optional)</Label>
            <Textarea id="return-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await submitReturnRequest({ orderItemId, reason, description: description || undefined, images: [] });
                if (result.success) {
                  toast.success("Return request submitted");
                  setOpen(false);
                } else {
                  toast.error(result.message);
                }
              })
            }
          >
            {isPending && <Loader2 className="animate-spin" />} Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
