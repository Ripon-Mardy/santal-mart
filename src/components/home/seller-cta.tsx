import Link from "next/link";
import { Store, TrendingUp, Wallet, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";

const POINTS = [
  { icon: Store, label: "Create your store in minutes" },
  { icon: TrendingUp, label: "Reach thousands of customers" },
  { icon: Wallet, label: "Transparent commission & fast payouts" },
  { icon: Truck, label: "We handle discovery, you handle great products" },
];

export function SellerCta() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="overflow-hidden rounded-2xl bg-primary px-6 py-10 text-primary-foreground sm:px-12 sm:py-14">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-lg">
            <h2 className="text-2xl font-bold sm:text-3xl">Start Selling on BazarX</h2>
            <p className="mt-2 text-sm text-primary-foreground/85 sm:text-base">
              Create your store, list your products, and reach thousands of customers across Bangladesh.
            </p>
            <Button asChild size="lg" variant="secondary" className="mt-5">
              <Link href="/register/seller">Become a Seller</Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            {POINTS.map((p) => (
              <div key={p.label} className="flex items-start gap-2 text-sm">
                <p.icon className="mt-0.5 size-4 shrink-0" />
                <span className="text-primary-foreground/90">{p.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
