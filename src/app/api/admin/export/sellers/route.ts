import { requireAdminApi } from "@/lib/api-auth";
import { withApiErrorHandling } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { toCsv, csvResponse } from "@/lib/csv";
import { toNumber } from "@/lib/currency";

export const GET = withApiErrorHandling(async () => {
  await requireAdminApi();

  const sellers = await prisma.seller.findMany({
    include: { user: { select: { name: true, email: true } }, store: { select: { name: true, _count: { select: { products: true } } } }, wallet: true },
  });

  const rows = sellers.map((s) => ({
    businessName: s.businessName,
    storeName: s.store?.name ?? "",
    ownerName: s.user.name,
    ownerEmail: s.user.email,
    status: s.status,
    products: s.store?._count.products ?? 0,
    totalEarned: toNumber(s.wallet?.totalEarned ?? 0),
    joinedAt: s.createdAt.toISOString(),
  }));

  const csv = toCsv(rows, ["businessName", "storeName", "ownerName", "ownerEmail", "status", "products", "totalEarned", "joinedAt"]);
  return csvResponse("sellers.csv", csv);
});
