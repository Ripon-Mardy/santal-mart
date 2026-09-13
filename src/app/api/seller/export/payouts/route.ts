import { requireApprovedSellerApi } from "@/lib/api-auth";
import { withApiErrorHandling } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { toCsv, csvResponse } from "@/lib/csv";
import { toNumber } from "@/lib/currency";

export const GET = withApiErrorHandling(async () => {
  const seller = await requireApprovedSellerApi();

  const payouts = await prisma.payout.findMany({ where: { sellerId: seller.sellerId }, orderBy: { requestedAt: "desc" } });

  const rows = payouts.map((p) => ({
    amount: toNumber(p.amount),
    status: p.status,
    requestedAt: p.requestedAt.toISOString(),
    paidAt: p.paidAt?.toISOString() ?? "",
  }));

  const csv = toCsv(rows, ["amount", "status", "requestedAt", "paidAt"]);
  return csvResponse("my-payouts.csv", csv);
});
