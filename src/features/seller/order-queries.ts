import { prisma } from "@/lib/prisma";
import { parsePagination, paginate } from "@/lib/pagination";

export async function getSellerOrders(sellerId: string, searchParams: URLSearchParams) {
  const { page, skip, take } = parsePagination(searchParams);
  const status = searchParams.get("status");
  const q = searchParams.get("q");

  const where = {
    sellerId,
    ...(status ? { status: status as never } : {}),
    ...(q ? { subOrderNumber: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.sellerOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        order: { select: { orderNumber: true, user: { select: { name: true } }, paymentMethod: true, paymentStatus: true } },
        items: { select: { id: true, productName: true, quantity: true } },
      },
    }),
    prisma.sellerOrder.count({ where }),
  ]);

  return paginate(items, total, page, take);
}

export async function getSellerOrderDetail(sellerId: string, sellerOrderId: string) {
  return prisma.sellerOrder.findFirst({
    where: { id: sellerOrderId, sellerId },
    include: {
      order: { include: { user: true, address: true } },
      items: { include: { returnRequests: true } },
      statusEvents: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function getSellerReturns(sellerId: string, searchParams: URLSearchParams) {
  const { page, skip, take } = parsePagination(searchParams);
  const where = { sellerOrder: { sellerId } };

  const [items, total] = await Promise.all([
    prisma.returnRequest.findMany({
      where,
      orderBy: { requestedAt: "desc" },
      skip,
      take,
      include: { orderItem: true, sellerOrder: { select: { subOrderNumber: true } }, user: { select: { name: true } } },
    }),
    prisma.returnRequest.count({ where }),
  ]);

  return paginate(items, total, page, take);
}
