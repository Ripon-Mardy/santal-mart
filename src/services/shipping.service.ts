import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const FALLBACK_SHIPPING_FEE = 60;

type Db = Prisma.TransactionClient | typeof prisma;

/**
 * Resolves the shipping fee a seller charges to deliver to an address.
 * Sellers can define their own zones (spec §38-39: "Seller can configure
 * shipping rules"); when they haven't, we fall back to a platform-wide zone
 * for the same division/city, then a flat fallback rate.
 */
export async function resolveShippingFee(
  sellerId: string,
  address: { division: string; city: string },
  db: Db = prisma
): Promise<number> {
  const candidates = await db.shippingZone.findMany({
    where: {
      OR: [{ sellerId }, { sellerId: null }],
    },
  });

  const sellerZones = candidates.filter((z) => z.sellerId === sellerId);
  const platformZones = candidates.filter((z) => z.sellerId === null);

  const pick = (zones: typeof candidates) =>
    zones.find((z) => z.city?.toLowerCase() === address.city.toLowerCase()) ??
    zones.find((z) => z.division?.toLowerCase() === address.division.toLowerCase()) ??
    zones.find((z) => z.isDefault);

  const match = pick(sellerZones) ?? pick(platformZones);
  return match ? Number(match.flatRate) : FALLBACK_SHIPPING_FEE;
}
