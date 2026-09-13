import { requireAdminApi } from "@/lib/api-auth";
import { withApiErrorHandling } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { toCsv, csvResponse } from "@/lib/csv";
import { toNumber } from "@/lib/currency";

export const GET = withApiErrorHandling(async () => {
  await requireAdminApi();

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 5000,
    include: { user: { select: { name: true, email: true } } },
  });

  const rows = orders.map((o) => ({
    orderNumber: o.orderNumber,
    customer: o.user.name,
    email: o.user.email,
    status: o.status,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    subtotal: toNumber(o.subtotal),
    shipping: toNumber(o.shippingTotal),
    discount: toNumber(o.discountTotal),
    total: toNumber(o.total),
    placedAt: o.placedAt.toISOString(),
  }));

  const csv = toCsv(rows, ["orderNumber", "customer", "email", "status", "paymentStatus", "paymentMethod", "subtotal", "shipping", "discount", "total", "placedAt"]);
  return csvResponse("orders.csv", csv);
});
