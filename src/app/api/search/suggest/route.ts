import type { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { apiSuccess, withApiErrorHandling } from "@/lib/api-response";

export const GET = withApiErrorHandling(async (request: NextRequest) => {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return apiSuccess({ products: [], categories: [], brands: [], stores: [] });

  const [products, categories, brands, stores] = await Promise.all([
    prisma.product.findMany({
      where: { status: "APPROVED", isPublished: true, name: { contains: q, mode: "insensitive" } },
      select: { id: true, name: true, slug: true, images: { take: 1, orderBy: [{ isPrimary: "desc" }] } },
      take: 5,
    }),
    prisma.category.findMany({
      where: { isActive: true, name: { contains: q, mode: "insensitive" } },
      select: { id: true, name: true, slug: true },
      take: 4,
    }),
    prisma.brand.findMany({
      where: { isActive: true, name: { contains: q, mode: "insensitive" } },
      select: { id: true, name: true, slug: true },
      take: 4,
    }),
    prisma.store.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      select: { id: true, name: true, slug: true },
      take: 4,
    }),
  ]);

  return apiSuccess({ products, categories, brands, stores });
});
