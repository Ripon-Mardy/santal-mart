"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateSettingAction } from "@/features/admin/actions";

export function SettingInput({ settingKey, initialValue, group }: { settingKey: string; initialValue: string; group: string }) {
  const [value, setValue] = useState(initialValue);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      <Input value={value} onChange={(e) => setValue(e.target.value)} />
      <Button
        size="sm" variant="outline" disabled={isPending}
        onClick={() => startTransition(async () => {
          const result = await updateSettingAction(settingKey, value, group);
          if (result.success) toast.success("Setting saved");
          else toast.error(result.message);
        })}
      >
        {isPending && <Loader2 className="animate-spin" />} Save
      </Button>
    </div>
  );
}
