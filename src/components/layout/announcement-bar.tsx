import { Truck, ShieldCheck, Store } from "lucide-react";
import Link from "next/link";

export function AnnouncementBar() {
  return (
    <div className="hidden bg-primary text-primary-foreground md:block">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 text-xs">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Truck className="size-3.5" /> Fast delivery across Bangladesh
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5" /> Secure checkout, every order
          </span>
        </div>
        <Link href="/register/seller" className="flex items-center gap-1.5 font-medium hover:underline">
          <Store className="size-3.5" /> Become a Seller
        </Link>
      </div>
    </div>
  );
}
