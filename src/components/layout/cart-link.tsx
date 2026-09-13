"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/stores/cart-store";

export function CartCountHydrator({ initialCount }: { initialCount: number }) {
  const setItemCount = useCartStore((s) => s.setItemCount);
  useEffect(() => {
    setItemCount(initialCount);
  }, [initialCount, setItemCount]);
  return null;
}

export function CartLink() {
  const itemCount = useCartStore((s) => s.itemCount);

  return (
    <Link href="/cart" className="relative flex items-center rounded-md p-2 hover:bg-muted" aria-label="Cart">
      <ShoppingCart className="size-5" />
      {itemCount > 0 && (
        <Badge className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full p-0 text-[10px]">
          {itemCount > 9 ? "9+" : itemCount}
        </Badge>
      )}
    </Link>
  );
}
