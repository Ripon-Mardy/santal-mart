import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/currency";
import { dayKey, formatDayLabel } from "@/lib/date-range";

export async function getAdminDashboardStats(from: Date) {
  const [
    revenueAgg,
    commissionAgg,
    ordersCount,
    customersCount,
    sellersCount,
    pendingSellersCount,
    productsCount,
    pendingProductsCount,
    refundsAgg,
    pendingPayoutsCount,
    ordersInRange,
    recentOrders,
    pendingSellerApplications,
    lowStockProducts,
  ] = await Promise.all([
    prisma.order.aggregate({ where: { createdAt: { gte: from }, status: { not: "CANCELLED" } }, _sum: { total: true } }),
    prisma.sellerOrder.aggregate({ where: { createdAt: { gte: from }, status: { not: "CANCELLED" } }, _sum: { commissionTotal: true } }),
    prisma.order.count({ where: { createdAt: { gte: from } } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.seller.count({ where: { status: "APPROVED" } }),
    prisma.seller.count({ where: { status: "PENDING" } }),
    prisma.product.count(),
    prisma.product.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.refund.aggregate({ where: { createdAt: { gte: from } }, _sum: { amount: true } }),
    prisma.payout.count({ where: { status: "PENDING" } }),
    prisma.order.findMany({ where: { createdAt: { gte: from }, status: { not: "CANCELLED" } }, select: { createdAt: true, total: true } }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, orderNumber: true, total: true, status: true, createdAt: true, user: { select: { name: true } } },
    }),
    prisma.seller.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, businessName: true, createdAt: true, user: { select: { name: true, email: true } }, store: { select: { name: true } } },
    }),
    prisma.product.findMany({
      where: { status: "APPROVED" },
      select: { id: true, name: true, lowStockThreshold: true, inventory: { select: { stock: true, reserved: true } } },
    }),
  ]);

  const lowStock = lowStockProducts
    .filter((p) => p.inventory.some((i) => i.stock - i.reserved <= p.lowStockThreshold))
    .slice(0, 5);

  const byDay = new Map<string, { revenue: number; orders: number }>();
  for (const order of ordersInRange) {
    const key = dayKey(order.createdAt);
    const entry = byDay.get(key) ?? { revenue: 0, orders: 0 };
    entry.revenue += toNumber(order.total);
    entry.orders += 1;
    byDay.set(key, entry);
  }
  const revenueSeries = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({ label: formatDayLabel(key), revenue: Math.round(v.revenue), orders: v.orders }));

  return {
    totalRevenue: toNumber(revenueAgg._sum.total ?? 0),
    platformCommission: toNumber(commissionAgg._sum.commissionTotal ?? 0),
    ordersCount,
    customersCount,
    sellersCount,
    pendingSellersCount,
    productsCount,
    pendingProductsCount,
    refundsTotal: toNumber(refundsAgg._sum.amount ?? 0),
    pendingPayoutsCount,
    revenueSeries,
    recentOrders,
    pendingSellerApplications,
    lowStockProducts: lowStock,
  };
}

export async function getGrowthSeries(from: Date) {
  const [sellers, customers] = await Promise.all([
    prisma.seller.findMany({ where: { createdAt: { gte: from } }, select: { createdAt: true } }),
    prisma.user.findMany({ where: { role: "CUSTOMER", createdAt: { gte: from } }, select: { createdAt: true } }),
  ]);

  const byDay = new Map<string, { sellers: number; customers: number }>();
  for (const s of sellers) {
    const key = dayKey(s.createdAt);
    const entry = byDay.get(key) ?? { sellers: 0, customers: 0 };
    entry.sellers += 1;
    byDay.set(key, entry);
  }
  for (const c of customers) {
    const key = dayKey(c.createdAt);
    const entry = byDay.get(key) ?? { sellers: 0, customers: 0 };
    entry.customers += 1;
    byDay.set(key, entry);
  }

  return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, v]) => ({ label: formatDayLabel(key), ...v }));
}
