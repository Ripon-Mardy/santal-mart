import Image from "next/image";
import Link from "next/link";
import { Store as StoreIcon, Users } from "lucide-react";

import { SectionHeading } from "@/components/home/section-heading";

export function StoreGrid({
  stores,
}: {
  stores: { id: string; name: string; slug: string; logoUrl: string | null; followersCount: number; _count: { products: number } }[];
}) {
  if (stores.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-6">
      <SectionHeading title="Top Stores on BazarX" subtitle="Trusted sellers with thousands of happy customers" viewAllHref="/stores" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
        {stores.map((store) => (
          <Link key={store.id} href={`/stores/${store.slug}`} className="flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-shadow hover:shadow-md">
            <div className="relative flex size-14 items-center justify-center overflow-hidden rounded-full bg-muted">
              {store.logoUrl ? <Image src={store.logoUrl} alt={store.name} fill className="object-cover" sizes="56px" /> : <StoreIcon className="size-6 text-muted-foreground" />}
            </div>
            <span className="line-clamp-1 text-sm font-medium">{store.name}</span>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Users className="size-3" /> {store.followersCount} followers · {store._count.products} items
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
