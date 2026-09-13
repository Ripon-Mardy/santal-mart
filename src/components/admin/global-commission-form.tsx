"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setGlobalCommissionAction } from "@/features/admin/actions";

export function GlobalCommissionForm({ initialRate }: { initialRate: number }) {
  const [rate, setRate] = useState(initialRate);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <div className="relative w-32">
        <Input type="number" value={rate} onChange={(e) => setRate(Number(e.target.value))} className="pr-6" />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
      </div>
      <Button
        disabled={isPending}
        onClick={() => startTransition(async () => {
          const result = await setGlobalCommissionAction(rate);
          if (result.success) toast.success("Global commission rate updated");
          else toast.error(result.message);
        })}
      >
        {isPending && <Loader2 className="animate-spin" />} Save
      </Button>
    </div>
  );
}
