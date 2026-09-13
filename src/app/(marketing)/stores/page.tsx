import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Store as StoreIcon, Users, Package } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { parsePagination, paginate } from "@/lib/pagination";
import { PaginationBar } from "@/components/shared/pagination-bar";

export const metadata: Metadata = { title: "All Stores" };

export default async function StoresPage({ searchParams }: PageProps<"/stores">) {
  const sp = await searchParams;
  const params = new URLSearchParams(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : (v ?? "")]));
  const { page, skip, take } = parsePagination(params, 24);

  const where = { seller: { status: "APPROVED" as const } };
  const [stores, total] = await Promise.all([
    prisma.store.findMany({
      where,
      orderBy: [{ followersCount: "desc" }],
      skip,
      take,
      select: { id: true, name: true, slug: true, logoUrl: true, bannerUrl: true, city: true, followersCount: true, _count: { select: { products: true } } },
    }),
    prisma.store.count({ where }),
  ]);
  const result = paginate(stores, total, page, take);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold">All Stores</h1>
      <p className="mt-1 text-sm text-muted-foreground">{total} trusted sellers on BazarX</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {result.items.map((store) => (
          <Link key={store.id} href={`/stores/${store.slug}`} className="overflow-hidden rounded-xl border transition-shadow hover:shadow-md">
            <div className="relative h-24 bg-muted">
              {store.bannerUrl && <Image src={store.bannerUrl} alt="" fill className="object-cover" sizes="400px" />}
            </div>
            <div className="flex items-center gap-3 p-4">
              <div className="relative -mt-8 flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-background bg-muted">
                {store.logoUrl ? <Image src={store.logoUrl} alt={store.name} fill className="object-cover" sizes="56px" /> : <StoreIcon className="size-6 text-muted-foreground" />}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold">{store.name}</p>
                <p className="truncate text-xs text-muted-foreground">{store.city}</p>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Package className="size-3" /> {store._count.products}</span>
                  <span className="flex items-center gap-1"><Users className="size-3" /> {store.followersCount}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <PaginationBar page={result.page} totalPages={result.totalPages} basePath="/stores" />
      </div>
    </div>
  );
}
