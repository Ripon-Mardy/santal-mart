"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { toggleFeatureFlagAction } from "@/features/admin/actions";

export function FeatureFlagToggle({ flagKey, initialEnabled }: { flagKey: string; initialEnabled: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Switch
      checked={initialEnabled}
      disabled={isPending}
      onCheckedChange={(checked) =>
        startTransition(async () => {
          const result = await toggleFeatureFlagAction(flagKey, checked);
          if (!result.success) toast.error(result.message);
        })
      }
    />
  );
}
