"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Tag, Truck, Wallet, Banknote } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AddressFormDialog } from "@/components/address/address-form-dialog";
import { formatCurrency } from "@/lib/currency";
import { placeOrder, previewCoupon } from "@/features/checkout/actions";
import type { CartSummary } from "@/features/cart/queries";
import { cn } from "cn";

type Address = {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  city: string;
  division: string;
  isDefault: boolean;
  type: string;
};

const PAYMENT_METHODS = [
  { value: "COD", label: "Cash on Delivery", icon: Banknote, desc: "Pay when your order arrives" },
  { value: "MOCK_CARD", label: "Card Payment", icon: Wallet, desc: "Demo card payment (always succeeds)" },
  { value: "MOCK_WALLET", label: "Mobile Wallet", icon: Wallet, desc: "Demo mobile wallet payment" },
] as const;

export function CheckoutForm({
  addresses,
  cart,
  shippingEstimates,
}: {
  addresses: Address[];
  cart: CartSummary;
  shippingEstimates: Record<string, number>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [addressId, setAddressId] = useState(addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? "");
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "MOCK_CARD" | "MOCK_WALLET">("COD");
  const [notes, setNotes] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discountAmount: number; freeShipping: boolean } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const shippingTotal = coupon?.freeShipping ? 0 : Object.values(shippingEstimates).reduce((sum, v) => sum + v, 0);
  const discount = coupon?.discountAmount ?? 0;
  const total = Math.max(0, cart.subtotal + shippingTotal - discount);

  async function applyCoupon() {
    if (!couponCode.trim()) return;
    setIsApplyingCoupon(true);
    setCouponError(null);
    const result = await previewCoupon(couponCode.trim());
    setIsApplyingCoupon(false);
    if (!result.success) {
      setCouponError(result.message);
      setCoupon(null);
      return;
    }
    setCoupon({ code: couponCode.trim().toUpperCase(), discountAmount: result.discountAmount, freeShipping: result.freeShipping });
  }

  function handlePlaceOrder() {
    if (!addressId) {
      toast.error("Please select or add a delivery address");
      return;
    }
    startTransition(async () => {
      const result = await placeOrder({
        addressId,
        paymentMethod,
        couponCode: coupon?.code,
        notes: notes || undefined,
      });
      if (result && !result.success) {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Delivery Address</h2>
            <AddressFormDialog onSaved={() => router.refresh()} />
          </div>
          {addresses.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No addresses yet — add one to continue.</p>
          ) : (
            <RadioGroup value={addressId} onValueChange={setAddressId} className="space-y-2">
              {addresses.map((addr) => (
                <label key={addr.id} className={cn("flex cursor-pointer items-start gap-3 rounded-lg border p-3", addressId === addr.id && "border-primary bg-primary/5")}>
                  <RadioGroupItem value={addr.id} className="mt-1" />
                  <div className="text-sm">
                    <p className="font-medium">{addr.fullName} · {addr.phone}</p>
                    <p className="text-muted-foreground">{addr.line1}, {addr.city}, {addr.division}</p>
                    <span className="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 text-[11px]">{addr.type}</span>
                  </div>
                </label>
              ))}
            </RadioGroup>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-semibold">Payment Method</h2>
          <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)} className="space-y-2">
            {PAYMENT_METHODS.map((method) => (
              <label key={method.value} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border p-3", paymentMethod === method.value && "border-primary bg-primary/5")}>
                <RadioGroupItem value={method.value} />
                <method.icon className="size-4 text-muted-foreground" />
                <div className="text-sm">
                  <p className="font-medium">{method.label}</p>
                  <p className="text-muted-foreground">{method.desc}</p>
                </div>
              </label>
            ))}
          </RadioGroup>
        </section>

        <section>
          <h2 className="mb-3 font-semibold">Order Items</h2>
          <div className="space-y-3">
            {cart.groups.map((group) => (
              <div key={group.sellerId} className="rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between text-sm font-medium">
                  <span>{group.storeName}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground"><Truck className="size-3.5" /> {formatCurrency(shippingEstimates[group.sellerId] ?? 0)}</span>
                </div>
                {group.items.map((item) => (
                  <div key={item.id} className="flex justify-between py-1 text-sm text-muted-foreground">
                    <span className="line-clamp-1">{item.productName} {item.variantName && `(${item.variantName})`} × {item.quantity}</span>
                    <span>{formatCurrency(item.lineTotal)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section>
          <Label htmlFor="notes" className="mb-1.5">Order Notes (optional)</Label>
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Delivery instructions, gift note, etc." />
        </section>
      </div>

      <div className="h-fit space-y-4 rounded-xl border p-5">
        <h2 className="font-semibold">Order Summary</h2>

        <div className="flex gap-2">
          <Input placeholder="Coupon code" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} />
          <Button type="button" variant="outline" onClick={applyCoupon} disabled={isApplyingCoupon}>
            <Tag /> Apply
          </Button>
        </div>
        {couponError && <p className="text-xs text-destructive">{couponError}</p>}
        {coupon && <p className="text-xs text-emerald-600">Coupon {coupon.code} applied!</p>}

        <div className="space-y-2 border-t pt-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(cart.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{formatCurrency(shippingTotal)}</span></div>
          {discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-{formatCurrency(discount)}</span></div>}
        </div>
        <div className="flex justify-between border-t pt-3 font-semibold">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>

        <Button className="w-full" size="lg" disabled={isPending || !addressId} onClick={handlePlaceOrder}>
          {isPending && <Loader2 className="animate-spin" />} Place Order
        </Button>
      </div>
    </div>
  );
}
