import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { searchProducts, type ProductSort } from "@/services/search.service";
import { getUserWishlistProductIds } from "@/features/home/queries";
import { ProductGrid, ProductCard } from "@/components/shared/product-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { FiltersSidebar } from "@/components/search/filters-sidebar";
import { MobileFiltersSheet } from "@/components/search/mobile-filters-sheet";
import { SortSelect } from "@/components/search/sort-select";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { SearchX } from "lucide-react";

export async function generateMetadata({ params }: PageProps<"/category/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) return {};
  return {
    title: category.seoTitle || category.name,
    description: category.seoDescription || category.description || `Shop ${category.name} on BazarX`,
    alternates: { canonical: `/category/${category.slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/category/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const get = (key: string) => (Array.isArray(sp[key]) ? sp[key][0] : sp[key]);

  const category = await prisma.category.findUnique({
    where: { slug, isActive: true },
    include: { parent: true, children: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
  });
  if (!category) notFound();

  const page = Number(get("page")) || 1;

  const [session, brands, result] = await Promise.all([
    auth(),
    prisma.brand.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
    searchProducts({
      categorySlug: slug,
      brandSlugs: get("brand")?.split(",").filter(Boolean),
      minPrice: get("minPrice") ? Number(get("minPrice")) : undefined,
      maxPrice: get("maxPrice") ? Number(get("maxPrice")) : undefined,
      minRating: get("minRating") ? Number(get("minRating")) : undefined,
      hasDiscount: get("hasDiscount") === "true",
      inStockOnly: get("inStockOnly") === "true",
      sort: (get("sort") as ProductSort) || "relevance",
      page,
    }),
  ]);

  const wishlistIds = session?.user ? await getUserWishlistProductIds(session.user.id) : new Set<string>();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Breadcrumb className="mb-3">
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink asChild><Link href="/">Home</Link></BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          {category.parent && (
            <>
              <BreadcrumbItem><BreadcrumbLink asChild><Link href={`/category/${category.parent.slug}`}>{category.parent.name}</Link></BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}
          <BreadcrumbItem><BreadcrumbPage>{category.name}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{category.name}</h1>
          <p className="text-sm text-muted-foreground">{result.total} products</p>
        </div>
        <div className="flex items-center gap-2">
          <MobileFiltersSheet brands={brands} />
          <SortSelect />
        </div>
      </div>

      {category.children.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {category.children.map((child) => (
            <Link key={child.id} href={`/category/${child.slug}`} className="rounded-full border px-3 py-1.5 text-sm hover:border-primary hover:text-primary">
              {child.name}
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <div className="hidden md:block">
          <FiltersSidebar brands={brands} />
        </div>
        <div>
          {result.items.length === 0 ? (
            <EmptyState icon={SearchX} title="No products in this category yet" description="Check back soon, or browse other categories." />
          ) : (
            <>
              <ProductGrid>
                {result.items.map((product) => (
                  <ProductCard key={product.id} product={product} inWishlist={wishlistIds.has(product.id)} />
                ))}
              </ProductGrid>
              <div className="mt-8 flex justify-center">
                <PaginationBar page={result.page} totalPages={result.totalPages} basePath={`/category/${slug}`} searchParams={sp as Record<string, string>} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
