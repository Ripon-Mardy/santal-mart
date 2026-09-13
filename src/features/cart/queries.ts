import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/currency";

export type CartLine = {
  id: string;
  productId: string;
  variantId: string | null;
  productName: string;
  slug: string;
  image: string | null;
  variantName: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  availableStock: number;
  maxQuantity: number;
};

export type CartGroup = {
  sellerId: string;
  storeName: string;
  storeSlug: string;
  items: CartLine[];
  subtotal: number;
};

export type CartSummary = {
  groups: CartGroup[];
  itemCount: number;
  subtotal: number;
};

export async function getCartForUser(userId: string): Promise<CartSummary> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: {
              store: { select: { id: true, name: true, slug: true } },
              images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 },
              inventory: true,
            },
          },
          variant: { include: { inventory: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!cart || cart.items.length === 0) return { groups: [], itemCount: 0, subtotal: 0 };

  const bySeller = new Map<string, CartGroup>();

  for (const item of cart.items) {
    const { product } = item;
    const inventory = item.variant?.inventory ?? product.inventory[0];
    const available = inventory ? inventory.stock - inventory.reserved : 0;
    const unitPrice = toNumber(item.variant?.price ?? product.price);
    const lineTotal = Math.round(unitPrice * item.quantity * 100) / 100;

    const group = bySeller.get(product.sellerId) ?? {
      sellerId: product.sellerId,
      storeName: product.store.name,
      storeSlug: product.store.slug,
      items: [],
      subtotal: 0,
    };

    group.items.push({
      id: item.id,
      productId: product.id,
      variantId: item.variantId,
      productName: product.name,
      slug: product.slug,
      image: product.images[0]?.url ?? null,
      variantName: item.variant?.name ?? null,
      unitPrice,
      quantity: item.quantity,
      lineTotal,
      availableStock: available,
      maxQuantity: Math.max(0, available),
    });
    group.subtotal = Math.round((group.subtotal + lineTotal) * 100) / 100;
    bySeller.set(product.sellerId, group);
  }

  const groups = [...bySeller.values()];
  const itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = Math.round(groups.reduce((sum, g) => sum + g.subtotal, 0) * 100) / 100;

  return { groups, itemCount, subtotal };
}

export async function getCartItemCount(userId: string): Promise<number> {
  const result = await prisma.cartItem.aggregate({ where: { cart: { userId } }, _sum: { quantity: true } });
  return result._sum.quantity ?? 0;
}
