"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestSellerPayout } from "@/features/seller/actions";

export function RequestPayoutForm({ availableBalance }: { availableBalance: number }) {
  const [amount, setAmount] = useState(availableBalance);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <Input type="number" max={availableBalance} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
      </div>
      <Button
        disabled={isPending || amount <= 0 || amount > availableBalance}
        onClick={() =>
          startTransition(async () => {
            const result = await requestSellerPayout(amount);
            if (result.success) toast.success("Payout requested");
            else toast.error(result.message);
          })
        }
      >
        {isPending && <Loader2 className="animate-spin" />} Request Payout
      </Button>
    </div>
  );
}
