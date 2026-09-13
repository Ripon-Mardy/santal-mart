"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { getImageService, validateImageFile, ImageValidationError } from "@/services/image";
import { updateProfileSchema, changePasswordSchema } from "@/validations/account";
import type { ActionResult } from "@/features/auth/actions";

export async function updateProfile(formData: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = updateProfileSchema.safeParse(formData);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid input" };

  await prisma.user.update({ where: { id: user.id }, data: { name: parsed.data.name, phone: parsed.data.phone || null } });
  revalidatePath("/account/profile");
  return { success: true };
}

export async function changePassword(formData: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse(formData);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid input" };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser?.password) return { success: false, message: "No password set for this account" };

  const isValid = await bcrypt.compare(parsed.data.currentPassword, dbUser.password);
  if (!isValid) return { success: false, message: "Current password is incorrect" };

  const hashed = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
  return { success: true };
}

export async function uploadAvatar(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File)) return { success: false, message: "No file provided" };

  try {
    validateImageFile({ type: file.type, size: file.size });
  } catch (error) {
    if (error instanceof ImageValidationError) return { success: false, message: error.message };
    throw error;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await getImageService().upload(buffer, { folder: `users/${user.id}`, filename: file.name, contentType: file.type });

  await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: uploaded.url } });
  revalidatePath("/account/profile");
  return { success: true };
}
