"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitReview } from "@/features/reviews/actions";
import { cn } from "cn";

type EligibleItem = { id: string; sku: string; variantName: string | null; order: { orderNumber: string } };

export function WriteReviewDialog({ eligibleItems }: { eligibleItems: EligibleItem[] }) {
  const [open, setOpen] = useState(false);
  const [orderItemId, setOrderItemId] = useState(eligibleItems[0]?.id ?? "");
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();

  if (eligibleItems.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Write a Review</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Write a Review</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {eligibleItems.length > 1 && (
            <div>
              <Label className="mb-1.5">Which order?</Label>
              <Select value={orderItemId} onValueChange={setOrderItemId}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {eligibleItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.order.orderNumber}{item.variantName ? ` — ${item.variantName}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label className="mb-1.5">Your rating</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)}>
                  <Star className={cn("size-6", n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="review-title" className="mb-1.5">Title (optional)</Label>
            <Input id="review-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </div>
          <div>
            <Label htmlFor="review-comment" className="mb-1.5">Your review</Label>
            <Textarea id="review-comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={4} minLength={10} required />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={isPending || comment.trim().length < 10}
            onClick={() =>
              startTransition(async () => {
                const result = await submitReview({ orderItemId, rating, title: title || undefined, comment, images: [] });
                if (result.success) {
                  toast.success("Thanks for your review! It will appear once approved.");
                  setOpen(false);
                  setComment("");
                  setTitle("");
                } else {
                  toast.error(result.message);
                }
              })
            }
          >
            {isPending ? "Submitting…" : "Submit Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
