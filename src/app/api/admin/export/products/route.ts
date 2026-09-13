import { requireAdminApi } from "@/lib/api-auth";
import { withApiErrorHandling } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { toCsv, csvResponse } from "@/lib/csv";
import { toNumber } from "@/lib/currency";

export const GET = withApiErrorHandling(async () => {
  await requireAdminApi();

  const products = await prisma.product.findMany({
    take: 10000,
    include: { seller: { select: { store: { select: { name: true } } } }, category: { select: { name: true } } },
  });

  const rows = products.map((p) => ({
    name: p.name,
    sku: p.sku,
    seller: p.seller.store?.name ?? "",
    category: p.category.name,
    price: toNumber(p.price),
    status: p.status,
    isPublished: p.isPublished,
    soldCount: p.soldCount,
  }));

  const csv = toCsv(rows, ["name", "sku", "seller", "category", "price", "status", "isPublished", "soldCount"]);
  return csvResponse("products.csv", csv);
});
