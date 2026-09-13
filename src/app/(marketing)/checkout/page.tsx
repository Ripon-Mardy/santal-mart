import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/rbac";
import { getCheckoutData } from "@/features/checkout/queries";
import { CheckoutForm } from "@/components/checkout/checkout-form";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const user = await requireUser();
  const { addresses, cart, shippingEstimates } = await getCheckoutData(user.id);

  if (cart.groups.length === 0) {
    redirect("/cart");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-6 text-xl font-bold">Checkout</h1>
      <CheckoutForm addresses={addresses} cart={cart} shippingEstimates={Object.fromEntries(shippingEstimates)} />
    </div>
  );
}
