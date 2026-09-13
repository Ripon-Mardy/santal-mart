"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { cartItemSchema } from "@/validations/checkout";
import { toNumber } from "@/lib/currency";
import type { ActionResult } from "@/features/auth/actions";

async function getOrCreateCartId(userId: string) {
  const cart = await prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
  return cart.id;
}

export async function addToCart(formData: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = cartItemSchema.safeParse(formData);
  if (!parsed.success) return { success: false, message: "Invalid item" };

  const product = await prisma.product.findUnique({
    where: { id: parsed.data.productId },
    include: { variants: true, inventory: true },
  });
  if (!product || product.status !== "APPROVED" || !product.isPublished) {
    return { success: false, message: "This product is not available" };
  }

  const variant = parsed.data.variantId
    ? product.variants.find((v) => v.id === parsed.data.variantId)
    : undefined;
  if (parsed.data.variantId && !variant)
    return { success: false, message: "Selected variant not found" };

  const inventory = variant
    ? product.inventory.find((i) => i.variantId === variant.id)
    : product.inventory.find((i) => i.variantId === null);
  const available = inventory ? inventory.stock - inventory.reserved : 0;
  if (available < 1)
    return { success: false, message: "This item is out of stock" };

  const cartId = await getOrCreateCartId(user.id);
  const unitPrice = toNumber(variant?.price ?? product.price);
  const variantId = variant?.id ?? null;

  const existing = await prisma.cartItem.findFirst({
    where: { cartId, productId: product.id, variantId },
  });

  const desiredQuantity = (existing?.quantity ?? 0) + parsed.data.quantity;
  if (desiredQuantity > available) {
    return { success: false, message: `Only ${available} left in stock` };
  }

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: desiredQuantity, priceSnapshot: unitPrice },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId,
        productId: product.id,
        variantId,
        quantity: parsed.data.quantity,
        priceSnapshot: unitPrice,
      },
    });
  }

  revalidatePath("/cart");
  return { success: true };
}

export async function updateCartItemQuantity(
  cartItemId: string,
  quantity: number,
): Promise<ActionResult> {
  const user = await requireUser();
  if (quantity < 1)
    return { success: false, message: "Quantity must be at least 1" };

  const item = await prisma.cartItem.findFirst({
    where: { id: cartItemId, cart: { userId: user.id } },
    include: {
      product: { include: { inventory: true } },
      variant: { include: { inventory: true } },
    },
  });
  if (!item) return { success: false, message: "Item not found in your cart" };

  const inventory =
    item.variant?.inventory ??
    item.product.inventory.find((i) => i.variantId === null);
  const available = inventory ? inventory.stock - inventory.reserved : 0;
  if (quantity > available)
    return { success: false, message: `Only ${available} left in stock` };

  await prisma.cartItem.update({
    where: { id: cartItemId },
    data: { quantity },
  });
  revalidatePath("/cart");
  return { success: true };
}

export async function removeCartItem(
  cartItemId: string,
): Promise<ActionResult> {
  const user = await requireUser();
  await prisma.cartItem.deleteMany({
    where: { id: cartItemId, cart: { userId: user.id } },
  });
  revalidatePath("/cart");
  return { success: true };
}

export async function clearCart(): Promise<ActionResult> {
  const user = await requireUser();
  await prisma.cartItem.deleteMany({ where: { cart: { userId: user.id } } });
  revalidatePath("/cart");
  return { success: true };
}
