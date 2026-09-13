import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";

export function CartSummaryCard({ subtotal, itemCount }: { subtotal: number; itemCount: number }) {
  return (
    <div className="h-fit space-y-4 rounded-xl border p-5">
      <h2 className="font-semibold">Order Summary</h2>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal ({itemCount} items)</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Shipping & discounts</span>
          <span>Calculated at checkout</span>
        </div>
      </div>
      <div className="flex justify-between border-t pt-3 font-semibold">
        <span>Estimated Total</span>
        <span>{formatCurrency(subtotal)}</span>
      </div>
      <Button asChild className="w-full" size="lg">
        <Link href="/checkout">Proceed to Checkout</Link>
      </Button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5" /> Secure checkout, every order
      </p>
    </div>
  );
}
