import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { paginate, type Paginated } from "@/lib/pagination";

/**
 * Database-backed catalog search (ILIKE + indexed columns). Deliberately
 * isolated behind this one function so a real search engine (Meilisearch /
 * Typesense / Elasticsearch) can replace the implementation later without
 * touching any page or server action that calls searchProducts().
 */

export type ProductSort = "relevance" | "newest" | "price_asc" | "price_desc" | "rating_desc" | "popular";

export type SearchProductsParams = {
  q?: string;
  categorySlug?: string;
  brandSlugs?: string[];
  sellerSlug?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  hasDiscount?: boolean;
  inStockOnly?: boolean;
  featuredOnly?: boolean;
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
};

export const PRODUCT_CARD_SELECT = {
  id: true,
  name: true,
  slug: true,
  price: true,
  compareAtPrice: true,
  avgRating: true,
  reviewCount: true,
  soldCount: true,
  createdAt: true,
  images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 },
  store: { select: { name: true, slug: true } },
  inventory: { select: { stock: true, reserved: true } },
} satisfies Prisma.ProductSelect;

async function getCategoryAndDescendantIds(slug: string): Promise<string[]> {
  const root = await prisma.category.findUnique({ where: { slug } });
  if (!root) return [];

  const ids = [root.id];
  let frontier = [root.id];
  // Two levels of nesting cover the spec's example taxonomy; loop guards
  // against unexpectedly deep trees without hardcoding a depth limit.
  for (let i = 0; i < 5 && frontier.length > 0; i++) {
    const children = await prisma.category.findMany({ where: { parentId: { in: frontier } }, select: { id: true } });
    if (children.length === 0) break;
    frontier = children.map((c) => c.id);
    ids.push(...frontier);
  }
  return ids;
}

export async function searchProducts(params: SearchProductsParams): Promise<Paginated<Prisma.ProductGetPayload<{ select: typeof PRODUCT_CARD_SELECT }>>> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(60, Math.max(1, params.pageSize ?? 20));

  const where: Prisma.ProductWhereInput = {
    status: "APPROVED",
    isPublished: true,
  };

  if (params.q) {
    where.OR = [
      { name: { contains: params.q, mode: "insensitive" } },
      { sku: { contains: params.q, mode: "insensitive" } },
      { shortDescription: { contains: params.q, mode: "insensitive" } },
      { brand: { name: { contains: params.q, mode: "insensitive" } } },
      { tags: { some: { tag: { name: { contains: params.q, mode: "insensitive" } } } } },
    ];
  }

  if (params.categorySlug) {
    const ids = await getCategoryAndDescendantIds(params.categorySlug);
    where.categoryId = { in: ids.length > 0 ? ids : ["__none__"] };
  }

  if (params.brandSlugs && params.brandSlugs.length > 0) {
    where.brand = { slug: { in: params.brandSlugs } };
  }

  if (params.sellerSlug) {
    where.store = { slug: params.sellerSlug };
  }

  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    where.price = {
      ...(params.minPrice !== undefined ? { gte: params.minPrice } : {}),
      ...(params.maxPrice !== undefined ? { lte: params.maxPrice } : {}),
    };
  }

  if (params.minRating !== undefined) {
    where.avgRating = { gte: params.minRating };
  }

  if (params.hasDiscount) {
    where.compareAtPrice = { not: null };
  }

  if (params.featuredOnly) {
    where.isFeatured = true;
  }

  if (params.inStockOnly) {
    where.inventory = { some: { stock: { gt: 0 } } };
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    params.sort === "price_asc"
      ? { price: "asc" }
      : params.sort === "price_desc"
        ? { price: "desc" }
        : params.sort === "rating_desc"
          ? { avgRating: "desc" }
          : params.sort === "popular"
            ? { soldCount: "desc" }
            : { createdAt: "desc" }; // "newest" and default "relevance" (no full-text ranking yet)

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: PRODUCT_CARD_SELECT,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return paginate(items, total, page, pageSize);
}
