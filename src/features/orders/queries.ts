import { prisma } from "@/lib/prisma";
import { parsePagination, paginate } from "@/lib/pagination";

export async function getUserOrders(userId: string, searchParams: URLSearchParams) {
  const { page, skip, take } = parsePagination(searchParams);
  const status = searchParams.get("status");

  const where = { userId, ...(status ? { status: status as never } : {}) };

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        items: { take: 3, select: { image: true, productName: true } },
        sellerOrders: { select: { id: true, status: true, seller: { select: { store: { select: { name: true } } } } } },
        payment: { select: { status: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return paginate(items, total, page, take);
}

export async function getOrderForUser(orderId: string, userId: string) {
  return prisma.order.findFirst({
    where: { id: orderId, userId },
    include: {
      address: true,
      billingAddress: true,
      payment: true,
      coupon: true,
      statusEvents: { orderBy: { createdAt: "asc" } },
      sellerOrders: {
        include: {
          seller: { select: { store: { select: { name: true, slug: true } } } },
          items: { include: { review: true, returnRequests: true } },
          statusEvents: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });
}
