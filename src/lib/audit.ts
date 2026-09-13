import "server-only";

import { headers } from "next/headers";

import { prisma } from "@/lib/prisma";

/**
 * Sensitive admin/seller actions that must be traceable (spec §45).
 * Kept as a const union rather than a DB enum so new action types can be
 * added without a migration — the AuditLog table stores the raw string.
 */
export const AUDIT_ACTIONS = {
  SELLER_APPROVED: "SELLER_APPROVED",
  SELLER_REJECTED: "SELLER_REJECTED",
  SELLER_SUSPENDED: "SELLER_SUSPENDED",
  SELLER_REACTIVATED: "SELLER_REACTIVATED",
  PRODUCT_APPROVED: "PRODUCT_APPROVED",
  PRODUCT_REJECTED: "PRODUCT_REJECTED",
  PRODUCT_ARCHIVED: "PRODUCT_ARCHIVED",
  USER_SUSPENDED: "USER_SUSPENDED",
  USER_ACTIVATED: "USER_ACTIVATED",
  ORDER_CANCELLED: "ORDER_CANCELLED",
  ORDER_REFUNDED: "ORDER_REFUNDED",
  PAYOUT_APPROVED: "PAYOUT_APPROVED",
  PAYOUT_REJECTED: "PAYOUT_REJECTED",
  PAYOUT_MARKED_PAID: "PAYOUT_MARKED_PAID",
  COMMISSION_UPDATED: "COMMISSION_UPDATED",
  CATEGORY_CREATED: "CATEGORY_CREATED",
  CATEGORY_UPDATED: "CATEGORY_UPDATED",
  CATEGORY_DELETED: "CATEGORY_DELETED",
  BRAND_CREATED: "BRAND_CREATED",
  BRAND_UPDATED: "BRAND_UPDATED",
  BRAND_DELETED: "BRAND_DELETED",
  BANNER_CREATED: "BANNER_CREATED",
  BANNER_UPDATED: "BANNER_UPDATED",
  BANNER_DELETED: "BANNER_DELETED",
  COUPON_CREATED: "COUPON_CREATED",
  COUPON_UPDATED: "COUPON_UPDATED",
  COUPON_DELETED: "COUPON_DELETED",
  REVIEW_MODERATED: "REVIEW_MODERATED",
  SETTINGS_CHANGED: "SETTINGS_CHANGED",
  FEATURE_FLAG_TOGGLED: "FEATURE_FLAG_TOGGLED",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export async function writeAuditLog(params: {
  userId: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  let ipAddress: string | null = null;
  try {
    const h = await headers();
    ipAddress = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip");
  } catch {
    // headers() is unavailable outside a request scope (e.g. seed script) — that's fine.
  }

  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      ipAddress,
      metadata: params.metadata as never,
    },
  });
}
