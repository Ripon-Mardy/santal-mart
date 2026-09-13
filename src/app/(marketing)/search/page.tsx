import type { Metadata } from "next";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { searchProducts, type ProductSort } from "@/services/search.service";
import { getUserWishlistProductIds } from "@/features/home/queries";
import { ProductGrid } from "@/components/shared/product-card";
import { ProductCard } from "@/components/shared/product-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { FiltersSidebar } from "@/components/search/filters-sidebar";
import { MobileFiltersSheet } from "@/components/search/mobile-filters-sheet";
import { SortSelect } from "@/components/search/sort-select";
import { SearchX } from "lucide-react";

export const metadata: Metadata = {
  title: "Search",
};

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const get = (key: string) => (Array.isArray(sp[key]) ? sp[key][0] : sp[key]);

  const q = get("q");
  const page = Number(get("page")) || 1;

  const [session, brands, result] = await Promise.all([
    auth(),
    prisma.brand.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
    searchProducts({
      q,
      brandSlugs: get("brand")?.split(",").filter(Boolean),
      minPrice: get("minPrice") ? Number(get("minPrice")) : undefined,
      maxPrice: get("maxPrice") ? Number(get("maxPrice")) : undefined,
      minRating: get("minRating") ? Number(get("minRating")) : undefined,
      hasDiscount: get("hasDiscount") === "true",
      inStockOnly: get("inStockOnly") === "true",
      featuredOnly: get("featured") === "true",
      sort: (get("sort") as ProductSort) || "relevance",
      page,
    }),
  ]);

  const wishlistIds = session?.user ? await getUserWishlistProductIds(session.user.id) : new Set<string>();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{q ? `Results for "${q}"` : "All Products"}</h1>
          <p className="text-sm text-muted-foreground">{result.total} products found</p>
        </div>
        <div className="flex items-center gap-2">
          <MobileFiltersSheet brands={brands} />
          <SortSelect />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <div className="hidden md:block">
          <FiltersSidebar brands={brands} />
        </div>

        <div>
          {result.items.length === 0 ? (
            <EmptyState icon={SearchX} title="No products found" description="Try adjusting your filters or search for something else." />
          ) : (
            <>
              <ProductGrid>
                {result.items.map((product) => (
                  <ProductCard key={product.id} product={product} inWishlist={wishlistIds.has(product.id)} />
                ))}
              </ProductGrid>
              <div className="mt-8 flex justify-center">
                <PaginationBar page={result.page} totalPages={result.totalPages} basePath="/search" searchParams={sp as Record<string, string>} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
