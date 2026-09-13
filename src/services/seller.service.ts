import "server-only";

import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/api-response";
import { writeAuditLog, AUDIT_ACTIONS } from "@/lib/audit";
import { notifyUser } from "@/services/notification.service";
import { sendTemplateEmail, emailTemplates } from "@/services/email";

export async function approveSeller(sellerId: string, adminId: string) {
  const seller = await prisma.seller.findUnique({ where: { id: sellerId }, include: { user: true, store: true } });
  if (!seller) throw new AppError("Seller not found", "SELLER_NOT_FOUND", 404);

  await prisma.$transaction(async (tx) => {
    await tx.seller.update({
      where: { id: sellerId },
      data: { status: "APPROVED", approvedAt: new Date(), approvedById: adminId, rejectionReason: null },
    });
    await tx.wallet.upsert({ where: { sellerId }, update: {}, create: { sellerId } });
  });

  await writeAuditLog({ userId: adminId, action: AUDIT_ACTIONS.SELLER_APPROVED, entityType: "Seller", entityId: sellerId });
  await notifyUser({
    userId: seller.userId,
    type: "SELLER",
    title: "Store approved 🎉",
    message: `Your store "${seller.store?.name}" has been approved. You can start listing products.`,
    link: "/seller/dashboard",
  });
  await sendTemplateEmail(seller.user.email, emailTemplates.sellerApproved(seller.store?.name ?? seller.businessName));
}

export async function rejectSeller(sellerId: string, adminId: string, reason: string) {
  const seller = await prisma.seller.findUnique({ where: { id: sellerId }, include: { user: true, store: true } });
  if (!seller) throw new AppError("Seller not found", "SELLER_NOT_FOUND", 404);

  await prisma.seller.update({ where: { id: sellerId }, data: { status: "REJECTED", rejectionReason: reason } });

  await writeAuditLog({ userId: adminId, action: AUDIT_ACTIONS.SELLER_REJECTED, entityType: "Seller", entityId: sellerId, metadata: { reason } });
  await notifyUser({
    userId: seller.userId,
    type: "SELLER",
    title: "Seller application rejected",
    message: reason,
    link: "/seller/onboarding",
  });
  await sendTemplateEmail(seller.user.email, emailTemplates.sellerRejected(seller.store?.name ?? seller.businessName, reason));
}

export async function suspendSeller(sellerId: string, adminId: string, reason?: string) {
  const seller = await prisma.seller.findUnique({ where: { id: sellerId }, include: { user: true } });
  if (!seller) throw new AppError("Seller not found", "SELLER_NOT_FOUND", 404);

  await prisma.seller.update({ where: { id: sellerId }, data: { status: "SUSPENDED", rejectionReason: reason } });
  await writeAuditLog({ userId: adminId, action: AUDIT_ACTIONS.SELLER_SUSPENDED, entityType: "Seller", entityId: sellerId, metadata: { reason } });
  await notifyUser({
    userId: seller.userId,
    type: "SELLER",
    title: "Store suspended",
    message: reason ?? "Your store has been suspended by the platform.",
  });
}

export async function reactivateSeller(sellerId: string, adminId: string) {
  const seller = await prisma.seller.findUnique({ where: { id: sellerId }, include: { user: true } });
  if (!seller) throw new AppError("Seller not found", "SELLER_NOT_FOUND", 404);

  await prisma.seller.update({ where: { id: sellerId }, data: { status: "APPROVED", rejectionReason: null } });
  await writeAuditLog({ userId: adminId, action: AUDIT_ACTIONS.SELLER_REACTIVATED, entityType: "Seller", entityId: sellerId });
  await notifyUser({ userId: seller.userId, type: "SELLER", title: "Store reactivated", message: "Your store has been reactivated." });
}
