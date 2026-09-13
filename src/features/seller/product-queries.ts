import { prisma } from "@/lib/prisma";
import { parsePagination, paginate } from "@/lib/pagination";

export async function getSellerProducts(sellerId: string, searchParams: URLSearchParams) {
  const { page, skip, take } = parsePagination(searchParams);
  const status = searchParams.get("status");
  const q = searchParams.get("q");

  const where = {
    sellerId,
    ...(status ? { status: status as never } : {}),
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        images: { orderBy: [{ isPrimary: "desc" }], take: 1 },
        category: { select: { name: true } },
        inventory: { select: { stock: true, reserved: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return paginate(items, total, page, take);
}

export async function getSellerProductForEdit(sellerId: string, productId: string) {
  return prisma.product.findFirst({
    where: { id: productId, sellerId },
    include: {
      images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
      variants: { include: { inventory: true } },
      inventory: true,
      tags: { include: { tag: true } },
    },
  });
}
