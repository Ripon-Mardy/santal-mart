import { requireApprovedSellerApi } from "@/lib/api-auth";
import { withApiErrorHandling } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { toCsv, csvResponse } from "@/lib/csv";
import { toNumber } from "@/lib/currency";

export const GET = withApiErrorHandling(async () => {
  const seller = await requireApprovedSellerApi();

  const products = await prisma.product.findMany({
    where: { sellerId: seller.sellerId },
    include: { inventory: true },
  });

  const rows = products.map((p) => ({
    name: p.name,
    sku: p.sku,
    price: toNumber(p.price),
    stock: p.inventory.reduce((sum, i) => sum + Math.max(0, i.stock - i.reserved), 0),
    status: p.status,
    soldCount: p.soldCount,
  }));

  const csv = toCsv(rows, ["name", "sku", "price", "stock", "status", "soldCount"]);
  return csvResponse("my-products.csv", csv);
});
