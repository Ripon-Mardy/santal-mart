"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Rating } from "@/components/shared/rating";

export type BrandOption = { id: string; name: string; slug: string };

export function FiltersSidebar({ brands }: { brands: BrandOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") ?? "");
  const selectedBrands = new Set(searchParams.get("brand")?.split(",").filter(Boolean));

  function updateParams(mutator: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutator(params);
    params.delete("page");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function toggleBrand(slug: string) {
    updateParams((params) => {
      const current = new Set(params.get("brand")?.split(",").filter(Boolean));
      if (current.has(slug)) current.delete(slug);
      else current.add(slug);
      if (current.size > 0) params.set("brand", [...current].join(","));
      else params.delete("brand");
    });
  }

  return (
    <aside className="space-y-6">
      <div>
        <h3 className="mb-2 text-sm font-semibold">Price Range</h3>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            updateParams((params) => {
              if (minPrice) params.set("minPrice", minPrice); else params.delete("minPrice");
              if (maxPrice) params.set("maxPrice", maxPrice); else params.delete("maxPrice");
            });
          }}
        >
          <Input type="number" min={0} placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="h-8" />
          <span className="text-muted-foreground">-</span>
          <Input type="number" min={0} placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="h-8" />
          <Button type="submit" size="sm" variant="outline">Go</Button>
        </form>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Rating</h3>
        <div className="space-y-1.5">
          {[4, 3, 2, 1].map((r) => (
            <button
              key={r}
              onClick={() => updateParams((params) => params.set("minRating", String(r)))}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
            >
              <Rating value={r} size="xs" /> & up
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Availability & Deals</h3>
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <Checkbox checked={searchParams.get("inStockOnly") === "true"} onCheckedChange={(v) => updateParams((p) => (v ? p.set("inStockOnly", "true") : p.delete("inStockOnly")))} />
            In stock only
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={searchParams.get("hasDiscount") === "true"} onCheckedChange={(v) => updateParams((p) => (v ? p.set("hasDiscount", "true") : p.delete("hasDiscount")))} />
            On sale
          </label>
        </div>
      </div>

      {brands.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Brands</h3>
          <div className="max-h-48 space-y-2 overflow-y-auto text-sm">
            {brands.map((brand) => (
              <label key={brand.id} className="flex items-center gap-2">
                <Checkbox checked={selectedBrands.has(brand.slug)} onCheckedChange={() => toggleBrand(brand.slug)} />
                <span>{brand.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
        Clear all filters
      </Button>
    </aside>
  );
}
