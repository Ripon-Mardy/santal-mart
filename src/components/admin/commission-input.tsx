"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/features/auth/actions";

export function CommissionInput({ initialRate, onSave, placeholder }: { initialRate: number | null; onSave: (rate: number | null) => Promise<ActionResult>; placeholder?: string }) {
  const [rate, setRate] = useState(initialRate?.toString() ?? "");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <div className="relative w-28">
        <Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} placeholder={placeholder ?? "Default"} className="pr-6" />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
      </div>
      <Button
        size="sm" variant="outline" disabled={isPending}
        onClick={() => startTransition(async () => {
          const result = await onSave(rate === "" ? null : Number(rate));
          if (result.success) toast.success("Commission updated");
          else toast.error(result.message);
        })}
      >
        {isPending && <Loader2 className="animate-spin" />} Save
      </Button>
    </div>
  );
}
