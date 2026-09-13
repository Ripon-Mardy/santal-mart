import { ShieldCheck, RotateCcw, Truck, Headset } from "lucide-react";

const ITEMS = [
  { icon: ShieldCheck, title: "Secure Payments", desc: "Your transactions are protected with industry-standard security." },
  { icon: Truck, title: "Fast Delivery", desc: "Reliable shipping across Bangladesh with live order tracking." },
  { icon: RotateCcw, title: "Easy Returns", desc: "Hassle-free returns and refunds on eligible items." },
  { icon: Headset, title: "Trusted Sellers", desc: "Every seller is verified and reviewed by real customers." },
];

export function TrustSection() {
  return (
    <section className="border-y bg-muted/40">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 md:grid-cols-4">
        {ITEMS.map((item) => (
          <div key={item.title} className="flex flex-col items-center gap-2 text-center sm:flex-row sm:items-start sm:text-left">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <item.icon className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
