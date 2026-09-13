"use client";

import { useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2, Store } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Price } from "@/components/shared/price";
import { updateCartItemQuantity, removeCartItem } from "@/features/cart/actions";
import type { CartGroup } from "@/features/cart/queries";

export function CartGroupCard({ group }: { group: CartGroup }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-xl border">
      <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
        <Store className="size-4 text-muted-foreground" />
        <Link href={`/stores/${group.storeSlug}`} className="text-sm font-medium hover:text-primary">
          {group.storeName}
        </Link>
      </div>
      <div className="divide-y">
        {group.items.map((item) => (
          <div key={item.id} className="flex gap-3 p-4">
            <Link href={`/products/${item.slug}`} className="relative size-20 shrink-0 overflow-hidden rounded-md bg-muted">
              {item.image && <Image src={item.image} alt={item.productName} fill className="object-cover" sizes="80px" />}
            </Link>
            <div className="flex flex-1 flex-col justify-between">
              <div>
                <Link href={`/products/${item.slug}`} className="line-clamp-1 text-sm font-medium hover:text-primary">
                  {item.productName}
                </Link>
                {item.variantName && <p className="text-xs text-muted-foreground">{item.variantName}</p>}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center rounded-md border">
                  <Button
                    variant="ghost" size="icon" className="size-7" disabled={isPending || item.quantity <= 1}
                    onClick={() => startTransition(async () => {
                      const result = await updateCartItemQuantity(item.id, item.quantity - 1);
                      if (!result.success) toast.error(result.message);
                    })}
                  >
                    <Minus className="size-3" />
                  </Button>
                  <span className="w-8 text-center text-sm tabular-nums">{item.quantity}</span>
                  <Button
                    variant="ghost" size="icon" className="size-7" disabled={isPending || item.quantity >= item.maxQuantity}
                    onClick={() => startTransition(async () => {
                      const result = await updateCartItemQuantity(item.id, item.quantity + 1);
                      if (!result.success) toast.error(result.message);
                    })}
                  >
                    <Plus className="size-3" />
                  </Button>
                </div>
                <Price amount={item.lineTotal} size="sm" />
              </div>
            </div>
            <Button
              variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground hover:text-destructive" disabled={isPending}
              onClick={() => startTransition(async () => { await removeCartItem(item.id); })}
              aria-label="Remove item"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
