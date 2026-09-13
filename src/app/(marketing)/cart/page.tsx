import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import { requireUser } from "@/lib/rbac";
import { getCartForUser } from "@/features/cart/queries";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { CartGroupCard } from "@/components/cart/cart-group-card";
import { CartSummaryCard } from "@/components/cart/cart-summary-card";

export const metadata: Metadata = { title: "Your Cart" };

export default async function CartPage() {
  const user = await requireUser();
  const cart = await getCartForUser(user.id);

  if (cart.groups.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          description="Looks like you haven't added anything yet. Start exploring thousands of products."
          action={
            <Button asChild>
              <Link href="/search">Start Shopping</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-xl font-bold">Your Cart</h1>
      <p className="mb-6 text-sm text-muted-foreground">{cart.itemCount} item(s) from {cart.groups.length} store(s)</p>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {cart.groups.map((group) => (
            <CartGroupCard key={group.sellerId} group={group} />
          ))}
        </div>
        <CartSummaryCard subtotal={cart.subtotal} itemCount={cart.itemCount} />
      </div>
    </div>
  );
}
