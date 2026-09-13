import Image from "next/image";
import Link from "next/link";

import { SectionHeading } from "@/components/home/section-heading";

export function CategoryGrid({
  categories,
}: {
  categories: { id: string; name: string; slug: string; imageUrl: string | null; _count: { products: number } }[];
}) {
  if (categories.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-6">
      <SectionHeading title="Shop by Category" subtitle="Browse thousands of products across every category" />
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-8">
        {categories.map((c) => (
          <Link key={c.id} href={`/category/${c.slug}`} className="group flex flex-col items-center gap-2 text-center">
            <div className="relative flex size-16 items-center justify-center overflow-hidden rounded-full bg-muted transition-transform group-hover:scale-105 sm:size-20">
              {c.imageUrl && <Image src={c.imageUrl} alt={c.name} fill className="object-cover" sizes="80px" />}
            </div>
            <span className="text-xs font-medium text-foreground sm:text-sm">{c.name}</span>
            <span className="text-[11px] text-muted-foreground">{c._count.products} items</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
