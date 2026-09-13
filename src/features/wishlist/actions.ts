"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import type { ActionResult } from "@/features/auth/actions";

async function getOrCreateWishlistId(userId: string) {
  const wishlist = await prisma.wishlist.upsert({ where: { userId }, update: {}, create: { userId } });
  return wishlist.id;
}

export async function toggleWishlist(productId: string): Promise<ActionResult & { added?: boolean }> {
  const user = await requireUser();
  const wishlistId = await getOrCreateWishlistId(user.id);

  const existing = await prisma.wishlistItem.findFirst({ where: { wishlistId, productId } });
  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    revalidatePath("/wishlist");
    return { success: true, added: false };
  }

  await prisma.wishlistItem.create({ data: { wishlistId, productId } });
  revalidatePath("/wishlist");
  return { success: true, added: true };
}

export async function moveWishlistItemToCart(productId: string): Promise<ActionResult> {
  const user = await requireUser();
  const { addToCart } = await import("@/features/cart/actions");
  const result = await addToCart({ productId, quantity: 1 });
  if (!result.success) return result;

  const wishlist = await prisma.wishlist.findUnique({ where: { userId: user.id } });
  if (wishlist) await prisma.wishlistItem.deleteMany({ where: { wishlistId: wishlist.id, productId } });

  revalidatePath("/wishlist");
  revalidatePath("/cart");
  return { success: true };
}
