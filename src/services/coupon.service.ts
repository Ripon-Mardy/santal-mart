import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export class CouponError extends Error {}

export type CouponCartLine = {
  productId: string;
  categoryId: string;
  sellerId: string;
  lineTotal: number;
};

export type CouponValidationResult = {
  couponId: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING";
  discountAmount: number;
  freeShipping: boolean;
};

/**
 * Validates a coupon code against the current cart server-side (never trust
 * a discount amount computed on the client) and returns how much it
 * discounts. Throws CouponError with a user-facing reason on failure.
 */
export async function validateCoupon(
  code: string,
  userId: string,
  lines: CouponCartLine[],
  db: Prisma.TransactionClient | typeof prisma = prisma
): Promise<CouponValidationResult> {
  const coupon = await db.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!coupon) throw new CouponError("Coupon code not found");
  if (!coupon.isActive) throw new CouponError("This coupon is no longer active");

  const now = new Date();
  if (now < coupon.startsAt) throw new CouponError("This coupon is not active yet");
  if (now > coupon.endsAt) throw new CouponError("This coupon has expired");

  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    throw new CouponError("This coupon has reached its usage limit");
  }

  if (coupon.perUserLimit !== null) {
    const usedByUser = await db.couponUsage.count({ where: { couponId: coupon.id, userId } });
    if (usedByUser >= coupon.perUserLimit) {
      throw new CouponError("You've already used this coupon the maximum number of times");
    }
  }

  const applicableLines = lines.filter((line) => {
    if (coupon.productId && coupon.productId !== line.productId) return false;
    if (coupon.categoryId && coupon.categoryId !== line.categoryId) return false;
    if (coupon.sellerId && coupon.sellerId !== line.sellerId) return false;
    return true;
  });

  if (applicableLines.length === 0) {
    throw new CouponError("This coupon doesn't apply to any items in your cart");
  }

  const applicableSubtotal = applicableLines.reduce((sum, line) => sum + line.lineTotal, 0);

  const minOrderAmount = coupon.minOrderAmount ? Number(coupon.minOrderAmount) : 0;
  if (applicableSubtotal < minOrderAmount) {
    throw new CouponError(`Minimum order amount for this coupon is ${minOrderAmount}`);
  }

  if (coupon.discountType === "FREE_SHIPPING") {
    return { couponId: coupon.id, code: coupon.code, discountType: "FREE_SHIPPING", discountAmount: 0, freeShipping: true };
  }

  let discountAmount =
    coupon.discountType === "PERCENTAGE"
      ? applicableSubtotal * (Number(coupon.value) / 100)
      : Math.min(Number(coupon.value), applicableSubtotal);

  if (coupon.maxDiscount) {
    discountAmount = Math.min(discountAmount, Number(coupon.maxDiscount));
  }
  discountAmount = Math.round(discountAmount * 100) / 100;

  return {
    couponId: coupon.id,
    code: coupon.code,
    discountType: coupon.discountType,
    discountAmount,
    freeShipping: false,
  };
}

export async function recordCouponUsage(
  tx: Prisma.TransactionClient,
  params: { couponId: string; userId: string; orderId: string; discountAmount: number }
) {
  await tx.couponUsage.create({ data: params });
  await tx.coupon.update({ where: { id: params.couponId }, data: { usedCount: { increment: 1 } } });
}
