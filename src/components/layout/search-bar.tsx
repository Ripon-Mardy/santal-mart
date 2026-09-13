"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Store, Tag, Shapes, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "cn";

type Suggestions = {
  products: { id: string; name: string; slug: string }[];
  categories: { id: string; name: string; slug: string }[];
  brands: { id: string; name: string; slug: string }[];
  stores: { id: string; name: string; slug: string }[];
};

const EMPTY: Suggestions = { products: [], categories: [], brands: [], stores: [] };

export function SearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestions>(EMPTY);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) return;

    let cancelled = false;

    const timeout = setTimeout(async () => {
      if (cancelled) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        if (!cancelled && json.success) setSuggestions(json.data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query]);

  function goToSearch() {
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  const hasResults = suggestions.products.length + suggestions.categories.length + suggestions.brands.length + suggestions.stores.length > 0;

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          goToSearch();
        }}
        className="relative"
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search products, brands, and stores..."
          className="h-10 rounded-full pl-9 pr-4"
          aria-label="Search BazarX"
        />
      </form>

      {open && query.trim().length >= 2 && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border bg-popover shadow-lg">
          {loading ? (
            <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Searching…
            </div>
          ) : hasResults ? (
            <div className="max-h-96 overflow-y-auto py-2 text-sm">
              {suggestions.products.length > 0 && (
                <div className="px-2">
                  <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Products</p>
                  {suggestions.products.map((p) => (
                    <Link key={p.id} href={`/products/${p.slug}`} onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted">
                      <Search className="size-3.5 text-muted-foreground" /> {p.name}
                    </Link>
                  ))}
                </div>
              )}
              {suggestions.categories.length > 0 && (
                <div className="px-2">
                  <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Categories</p>
                  {suggestions.categories.map((c) => (
                    <Link key={c.id} href={`/category/${c.slug}`} onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted">
                      <Shapes className="size-3.5 text-muted-foreground" /> {c.name}
                    </Link>
                  ))}
                </div>
              )}
              {suggestions.brands.length > 0 && (
                <div className="px-2">
                  <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Brands</p>
                  {suggestions.brands.map((b) => (
                    <Link key={b.id} href={`/search?brand=${b.slug}`} onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted">
                      <Tag className="size-3.5 text-muted-foreground" /> {b.name}
                    </Link>
                  ))}
                </div>
              )}
              {suggestions.stores.length > 0 && (
                <div className="px-2">
                  <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Stores</p>
                  {suggestions.stores.map((s) => (
                    <Link key={s.id} href={`/stores/${s.slug}`} onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted">
                      <Store className="size-3.5 text-muted-foreground" /> {s.name}
                    </Link>
                  ))}
                </div>
              )}
              <button onClick={goToSearch} className="mt-1 block w-full border-t px-4 py-2 text-left text-primary hover:bg-muted">
                See all results for &ldquo;{query}&rdquo;
              </button>
            </div>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">No results for &ldquo;{query}&rdquo;</p>
          )}
        </div>
      )}
    </div>
  );
}
