import { prisma } from "@/lib/prisma";
import { getCartForUser } from "@/features/cart/queries";
import { resolveShippingFee } from "@/services/shipping.service";

export async function getCheckoutData(userId: string) {
  const [addresses, cart] = await Promise.all([
    prisma.address.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }),
    getCartForUser(userId),
  ]);

  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];

  const shippingEstimates = new Map<string, number>();
  if (defaultAddress) {
    for (const group of cart.groups) {
      const fee = await resolveShippingFee(group.sellerId, { division: defaultAddress.division, city: defaultAddress.city });
      shippingEstimates.set(group.sellerId, fee);
    }
  }

  return { addresses, cart, shippingEstimates };
}
