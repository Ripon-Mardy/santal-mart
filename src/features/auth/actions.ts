"use server";

import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { sendTemplateEmail, emailTemplates } from "@/services/email";
import {
  registerCustomerSchema,
  registerSellerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/validations/auth";
import { generateUniqueSlug } from "@/lib/slug";

export type ActionResult = { success: true } | { success: false; message: string };

export async function registerCustomer(formData: unknown): Promise<ActionResult> {
  const parsed = registerCustomerSchema.safeParse(formData);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { name, email, phone, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) return { success: false, message: "An account with this email already exists" };

  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { name, email: normalizedEmail, phone: phone || null, password: hashed, role: "CUSTOMER" },
    });
    await tx.cart.create({ data: { userId: created.id } });
    await tx.wishlist.create({ data: { userId: created.id } });
    return created;
  });

  const token = randomUUID();
  await prisma.emailVerificationToken.create({
    data: { userId: user.id, token, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
  });
  await sendTemplateEmail(user.email, emailTemplates.verifyEmail(user.name, token));
  await sendTemplateEmail(user.email, emailTemplates.welcome(user.name));

  return { success: true };
}

export async function registerSeller(formData: unknown): Promise<ActionResult> {
  const parsed = registerSellerSchema.safeParse(formData);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid input" };

  const data = parsed.data;
  const normalizedEmail = data.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) return { success: false, message: "An account with this email already exists" };

  const hashed = await bcrypt.hash(data.password, 12);
  const storeSlug = await generateUniqueSlug(data.storeName, async (candidate) => {
    const found = await prisma.store.findUnique({ where: { slug: candidate } });
    return !!found;
  });

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name: data.name, email: normalizedEmail, phone: data.phone, password: hashed, role: "SELLER" },
    });
    await tx.cart.create({ data: { userId: user.id } });
    await tx.wishlist.create({ data: { userId: user.id } });

    const seller = await tx.seller.create({
      data: {
        userId: user.id,
        businessName: data.businessName,
        businessType: data.businessType || null,
        taxId: data.taxId || null,
        phone: data.phone,
        status: "PENDING",
      },
    });

    await tx.store.create({
      data: {
        sellerId: seller.id,
        name: data.storeName,
        slug: storeSlug,
        description: data.storeDescription || null,
        city: data.city,
        country: data.country,
        email: normalizedEmail,
        phone: data.phone,
      },
    });
  });

  await sendTemplateEmail(normalizedEmail, emailTemplates.welcome(data.name));

  return { success: true };
}

export async function requestPasswordReset(formData: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(formData);
  if (!parsed.success) return { success: false, message: "Enter a valid email address" };

  const limited = rateLimit(`forgot-password:${parsed.data.email.toLowerCase()}`, { max: 5, windowMs: 15 * 60_000 });
  if (!limited.success) return { success: false, message: "Too many attempts. Please try again later." };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  // Always return success — never reveal whether an email is registered.
  if (!user) return { success: true };

  const token = randomUUID();
  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
  });
  await sendTemplateEmail(user.email, emailTemplates.passwordReset(user.name, token));

  return { success: true };
}

export async function resetPassword(formData: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(formData);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid input" };

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token: parsed.data.token } });
  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return { success: false, message: "This reset link is invalid or has expired" };
  }

  const hashed = await bcrypt.hash(parsed.data.password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { password: hashed } }),
    prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
  ]);

  return { success: true };
}

export async function verifyEmail(token: string): Promise<ActionResult> {
  const record = await prisma.emailVerificationToken.findUnique({ where: { token } });
  if (!record || record.expiresAt < new Date()) {
    return { success: false, message: "This verification link is invalid or has expired" };
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerified: new Date() } }),
    prisma.emailVerificationToken.delete({ where: { id: record.id } }),
  ]);

  return { success: true };
}
