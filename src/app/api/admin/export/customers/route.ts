import { requireAdminApi } from "@/lib/api-auth";
import { withApiErrorHandling } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { toCsv, csvResponse } from "@/lib/csv";

export const GET = withApiErrorHandling(async () => {
  await requireAdminApi();

  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    include: { _count: { select: { orders: true } } },
  });

  const rows = customers.map((c) => ({
    name: c.name,
    email: c.email,
    phone: c.phone ?? "",
    orders: c._count.orders,
    status: c.status,
    joinedAt: c.createdAt.toISOString(),
  }));

  const csv = toCsv(rows, ["name", "email", "phone", "orders", "status", "joinedAt"]);
  return csvResponse("customers.csv", csv);
});
