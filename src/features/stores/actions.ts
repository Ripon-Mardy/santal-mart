"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import type { ActionResult } from "@/features/auth/actions";

export async function toggleStoreFollow(storeId: string): Promise<ActionResult & { following?: boolean }> {
  const user = await requireUser();

  const existing = await prisma.storeFollow.findFirst({ where: { userId: user.id, storeId } });

  if (existing) {
    await prisma.$transaction([
      prisma.storeFollow.delete({ where: { id: existing.id } }),
      prisma.store.update({ where: { id: storeId }, data: { followersCount: { decrement: 1 } } }),
    ]);
    revalidatePath("/stores");
    return { success: true, following: false };
  }

  await prisma.$transaction([
    prisma.storeFollow.create({ data: { userId: user.id, storeId } }),
    prisma.store.update({ where: { id: storeId }, data: { followersCount: { increment: 1 } } }),
  ]);
  revalidatePath("/stores");
  return { success: true, following: true };
}
