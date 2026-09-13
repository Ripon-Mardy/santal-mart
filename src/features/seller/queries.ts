import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/currency";
import { dayKey, formatDayLabel } from "@/lib/date-range";

export async function getSellerDashboardStats(sellerId: string, from: Date) {
  const [
    salesAgg,
    todayAgg,
    ordersCount,
    pendingOrdersCount,
    productsCount,
    lowStockProducts,
    customerCount,
    wallet,
    sellerOrdersInRange,
    topProducts,
  ] = await Promise.all([
    prisma.sellerOrder.aggregate({ where: { sellerId, createdAt: { gte: from }, status: { not: "CANCELLED" } }, _sum: { subtotal: true } }),
    prisma.sellerOrder.aggregate({
      where: { sellerId, createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }, status: { not: "CANCELLED" } },
      _sum: { subtotal: true },
    }),
    prisma.sellerOrder.count({ where: { sellerId, createdAt: { gte: from } } }),
    prisma.sellerOrder.count({ where: { sellerId, status: { in: ["PENDING", "CONFIRMED", "PROCESSING"] } } }),
    prisma.product.count({ where: { sellerId } }),
    prisma.product.findMany({
      where: { sellerId, inventory: { some: {} } },
      select: { id: true, name: true, lowStockThreshold: true, inventory: { select: { stock: true, reserved: true } } },
    }),
    prisma.order.findMany({ where: { sellerOrders: { some: { sellerId } } }, distinct: ["userId"], select: { userId: true } }),
    prisma.wallet.findUnique({ where: { sellerId } }),
    prisma.sellerOrder.findMany({
      where: { sellerId, createdAt: { gte: from }, status: { not: "CANCELLED" } },
      select: { createdAt: true, subtotal: true },
    }),
    prisma.orderItem.groupBy({
      by: ["productId", "productName"],
      where: { sellerOrder: { sellerId, status: { not: "CANCELLED" } } },
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
  ]);

  const lowStockCount = lowStockProducts.filter((p) =>
    p.inventory.some((i) => i.stock - i.reserved <= p.lowStockThreshold)
  ).length;

  const byDay = new Map<string, { revenue: number; orders: number }>();
  for (const so of sellerOrdersInRange) {
    const key = dayKey(so.createdAt);
    const entry = byDay.get(key) ?? { revenue: 0, orders: 0 };
    entry.revenue += toNumber(so.subtotal);
    entry.orders += 1;
    byDay.set(key, entry);
  }
  const revenueSeries = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({ label: formatDayLabel(key), revenue: Math.round(v.revenue), orders: v.orders }));

  return {
    totalSales: toNumber(salesAgg._sum.subtotal ?? 0),
    todaySales: toNumber(todayAgg._sum.subtotal ?? 0),
    ordersCount,
    pendingOrdersCount,
    productsCount,
    lowStockCount,
    customersCount: customerCount.length,
    availableBalance: toNumber(wallet?.balance ?? 0),
    pendingBalance: toNumber(wallet?.pendingBalance ?? 0),
    revenueSeries,
    topProducts: topProducts.map((p) => ({ id: p.productId, name: p.productName, quantity: p._sum.quantity ?? 0, revenue: toNumber(p._sum.total ?? 0) })),
  };
}
