import { requireAdminApi } from "@/lib/api-auth";
import { withApiErrorHandling } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { toCsv, csvResponse } from "@/lib/csv";
import { toNumber } from "@/lib/currency";

export const GET = withApiErrorHandling(async () => {
  await requireAdminApi();

  const payouts = await prisma.payout.findMany({
    orderBy: { requestedAt: "desc" },
    include: { seller: { select: { businessName: true } } },
  });

  const rows = payouts.map((p) => ({
    seller: p.seller.businessName,
    amount: toNumber(p.amount),
    status: p.status,
    requestedAt: p.requestedAt.toISOString(),
    paidAt: p.paidAt?.toISOString() ?? "",
  }));

  const csv = toCsv(rows, ["seller", "amount", "status", "requestedAt", "paidAt"]);
  return csvResponse("payouts.csv", csv);
});
