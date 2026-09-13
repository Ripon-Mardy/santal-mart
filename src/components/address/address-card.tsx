"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { AddressFormDialog } from "@/components/address/address-form-dialog";
import { deleteAddress } from "@/features/addresses/actions";
import type { AddressInput } from "@/validations/checkout";

export function AddressCard({ address }: { address: AddressInput & { id: string } }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-start justify-between rounded-lg border p-4">
      <div className="text-sm">
        <div className="flex items-center gap-2">
          <p className="font-medium">{address.fullName}</p>
          <Badge variant="outline">{address.type}</Badge>
          {address.isDefault && <Badge>Default</Badge>}
        </div>
        <p className="text-muted-foreground">{address.phone}</p>
        <p className="text-muted-foreground">{address.line1}, {address.city}, {address.division} {address.postalCode}</p>
      </div>
      <div className="flex items-center gap-1">
        <AddressFormDialog address={address} />
        <ConfirmDialog
          trigger={
            <Button variant="ghost" size="icon" disabled={isPending} aria-label="Delete address">
              <Trash2 className="size-4 text-destructive" />
            </Button>
          }
          title="Delete this address?"
          description="This action cannot be undone."
          onConfirm={() =>
            startTransition(async () => {
              const result = await deleteAddress(address.id);
              if (!result.success) toast.error(result.message);
            })
          }
        />
      </div>
    </div>
  );
}
