"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { suspendUserAction, activateUserAction } from "@/features/admin/actions";
import type { UserStatus } from "@/generated/prisma/client";

export function UserActions({ userId, status, role }: { userId: string; status: UserStatus; role: string }) {
  const [isPending, startTransition] = useTransition();

  if (role === "SUPER_ADMIN") return <span className="text-xs text-muted-foreground">-</span>;

  if (status === "ACTIVE") {
    return (
      <ConfirmDialog
        trigger={<Button size="sm" variant="destructive" disabled={isPending}>Suspend</Button>}
        title="Suspend this user?"
        onConfirm={() => startTransition(async () => {
          const result = await suspendUserAction(userId);
          if (!result.success) toast.error(result.message);
        })}
      />
    );
  }

  return (
    <Button size="sm" disabled={isPending} onClick={() => startTransition(async () => {
      const result = await activateUserAction(userId);
      if (!result.success) toast.error(result.message);
    })}>
      Activate
    </Button>
  );
}
