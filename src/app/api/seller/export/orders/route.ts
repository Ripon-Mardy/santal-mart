import { requireApprovedSellerApi } from "@/lib/api-auth";
import { withApiErrorHandling } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { toCsv, csvResponse } from "@/lib/csv";
import { toNumber } from "@/lib/currency";

export const GET = withApiErrorHandling(async () => {
  const seller = await requireApprovedSellerApi();

  const orders = await prisma.sellerOrder.findMany({
    where: { sellerId: seller.sellerId },
    orderBy: { createdAt: "desc" },
    include: { order: { select: { orderNumber: true, user: { select: { name: true } } } } },
  });

  const rows = orders.map((o) => ({
    subOrderNumber: o.subOrderNumber,
    orderNumber: o.order.orderNumber,
    customer: o.order.user.name,
    status: o.status,
    subtotal: toNumber(o.subtotal),
    payoutTotal: toNumber(o.payoutTotal),
    createdAt: o.createdAt.toISOString(),
  }));

  const csv = toCsv(rows, ["subOrderNumber", "orderNumber", "customer", "status", "subtotal", "payoutTotal", "createdAt"]);
  return csvResponse("my-orders.csv", csv);
});
