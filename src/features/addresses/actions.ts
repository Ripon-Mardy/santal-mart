"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { addressSchema } from "@/validations/checkout";
import type { ActionResult } from "@/features/auth/actions";

export async function createAddress(formData: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = addressSchema.safeParse(formData);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid address" };

  await prisma.$transaction(async (tx) => {
    if (parsed.data.isDefault) {
      await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    }
    const count = await tx.address.count({ where: { userId: user.id } });
    await tx.address.create({ data: { ...parsed.data, userId: user.id, isDefault: parsed.data.isDefault || count === 0 } });
  });

  revalidatePath("/account/addresses");
  return { success: true };
}

export async function updateAddress(addressId: string, formData: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = addressSchema.safeParse(formData);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid address" };

  const existing = await prisma.address.findFirst({ where: { id: addressId, userId: user.id } });
  if (!existing) return { success: false, message: "Address not found" };

  await prisma.$transaction(async (tx) => {
    if (parsed.data.isDefault) {
      await tx.address.updateMany({ where: { userId: user.id, id: { not: addressId } }, data: { isDefault: false } });
    }
    await tx.address.update({ where: { id: addressId }, data: parsed.data });
  });

  revalidatePath("/account/addresses");
  return { success: true };
}

export async function deleteAddress(addressId: string): Promise<ActionResult> {
  const user = await requireUser();
  await prisma.address.deleteMany({ where: { id: addressId, userId: user.id } });
  revalidatePath("/account/addresses");
  return { success: true };
}
