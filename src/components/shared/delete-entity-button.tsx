"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import type { ActionResult } from "@/features/auth/actions";

export function DeleteEntityButton({
  onDelete,
  entityLabel = "item",
}: {
  onDelete: () => Promise<ActionResult>;
  entityLabel?: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <ConfirmDialog
      trigger={<Button variant="ghost" size="icon" disabled={isPending}><Trash2 className="size-4 text-destructive" /></Button>}
      title={`Delete this ${entityLabel}?`}
      onConfirm={() =>
        startTransition(async () => {
          const result = await onDelete();
          if (!result.success) toast.error(result.message);
        })
      }
    />
  );
}
