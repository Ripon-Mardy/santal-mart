import "server-only";

import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/api-response";
import { writeAuditLog, AUDIT_ACTIONS } from "@/lib/audit";
import { notifyUser } from "@/services/notification.service";
import { sendTemplateEmail, emailTemplates } from "@/services/email";

export async function approveProduct(productId: string, adminId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId }, include: { seller: { include: { user: true } } } });
  if (!product) throw new AppError("Product not found", "PRODUCT_NOT_FOUND", 404);

  await prisma.product.update({
    where: { id: productId },
    data: { status: "APPROVED", isPublished: true, rejectionReason: null },
  });

  await writeAuditLog({ userId: adminId, action: AUDIT_ACTIONS.PRODUCT_APPROVED, entityType: "Product", entityId: productId });
  await notifyUser({
    userId: product.seller.userId,
    type: "PRODUCT",
    title: "Product approved",
    message: `"${product.name}" is now live on BazarX.`,
    link: `/seller/products/${productId}`,
  });
  await sendTemplateEmail(product.seller.user.email, emailTemplates.productApproved(product.name));
}

export async function rejectProduct(productId: string, adminId: string, reason: string) {
  const product = await prisma.product.findUnique({ where: { id: productId }, include: { seller: { include: { user: true } } } });
  if (!product) throw new AppError("Product not found", "PRODUCT_NOT_FOUND", 404);

  await prisma.product.update({
    where: { id: productId },
    data: { status: "REJECTED", isPublished: false, rejectionReason: reason },
  });

  await writeAuditLog({ userId: adminId, action: AUDIT_ACTIONS.PRODUCT_REJECTED, entityType: "Product", entityId: productId, metadata: { reason } });
  await notifyUser({
    userId: product.seller.userId,
    type: "PRODUCT",
    title: "Product rejected",
    message: reason,
    link: `/seller/products/${productId}`,
  });
  await sendTemplateEmail(product.seller.user.email, emailTemplates.productRejected(product.name, reason));
}

export async function archiveProduct(productId: string, adminId: string) {
  await prisma.product.update({ where: { id: productId }, data: { status: "ARCHIVED", isPublished: false } });
  await writeAuditLog({ userId: adminId, action: AUDIT_ACTIONS.PRODUCT_ARCHIVED, entityType: "Product", entityId: productId });
}
