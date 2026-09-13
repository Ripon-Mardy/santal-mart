"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireApprovedSeller } from "@/lib/rbac";
import { AppError } from "@/lib/api-response";
import { updateSellerOrderStatus } from "@/services/order-status.service";
import { requestPayout, InsufficientBalanceError } from "@/services/payout.service";
import { restock } from "@/services/inventory.service";
import { couponFormSchema } from "@/validations/checkout";
import { getImageService, validateImageFile, ImageValidationError } from "@/services/image";
import type { OrderStatus } from "@/generated/prisma/client";
import type { ActionResult } from "@/features/auth/actions";

export async function updateSellerOrderStatusAction(
  sellerOrderId: string,
  newStatus: OrderStatus,
  options: { trackingNumber?: string; shippingCarrier?: string; cancelReason?: string } = {}
): Promise<ActionResult> {
  const seller = await requireApprovedSeller();
  try {
    await updateSellerOrderStatus(sellerOrderId, newStatus, { sellerIdForAuth: seller.sellerId, ...options });
  } catch (error) {
    if (error instanceof AppError) return { success: false, message: error.message };
    throw error;
  }
  revalidatePath("/seller/orders");
  revalidatePath(`/seller/orders/${sellerOrderId}`);
  return { success: true };
}

export async function requestSellerPayout(amount: number): Promise<ActionResult> {
  const seller = await requireApprovedSeller();
  if (amount <= 0) return { success: false, message: "Enter a valid amount" };

  try {
    await requestPayout(seller.sellerId, amount);
  } catch (error) {
    if (error instanceof InsufficientBalanceError) return { success: false, message: error.message };
    throw error;
  }
  revalidatePath("/seller/payouts");
  return { success: true };
}

export async function adjustInventory(productId: string, variantId: string | null, delta: number, note?: string): Promise<ActionResult> {
  const seller = await requireApprovedSeller();
  const product = await prisma.product.findFirst({ where: { id: productId, sellerId: seller.sellerId } });
  if (!product) return { success: false, message: "Product not found" };
  if (delta === 0) return { success: false, message: "Enter a non-zero amount" };

  if (delta > 0) {
    await prisma.$transaction((tx) => restock(tx, [{ productId, variantId, quantity: delta }], "ADJUSTMENT", undefined, note));
  } else {
    const inventory = await prisma.inventory.findFirst({ where: { productId, variantId } });
    if (!inventory || inventory.stock + delta < 0) return { success: false, message: "Not enough stock to remove" };
    await prisma.$transaction(async (tx) => {
      await tx.inventory.update({ where: { id: inventory.id }, data: { stock: { decrement: -delta } } });
      await tx.inventoryMovement.create({ data: { inventoryId: inventory.id, type: "ADJUSTMENT", quantity: delta, note } });
    });
  }

  revalidatePath("/seller/inventory");
  return { success: true };
}

export async function createSellerCouponAction(formData: unknown): Promise<ActionResult> {
  const seller = await requireApprovedSeller();
  const parsed = couponFormSchema.safeParse(formData);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid coupon" };

  const existing = await prisma.coupon.findUnique({ where: { code: parsed.data.code.toUpperCase() } });
  if (existing) return { success: false, message: "This coupon code already exists" };

  await prisma.coupon.create({ data: { ...parsed.data, code: parsed.data.code.toUpperCase(), sellerId: seller.sellerId } });
  revalidatePath("/seller/coupons");
  return { success: true };
}

export async function updateSellerCouponAction(couponId: string, formData: unknown): Promise<ActionResult> {
  const seller = await requireApprovedSeller();
  const existing = await prisma.coupon.findFirst({ where: { id: couponId, sellerId: seller.sellerId } });
  if (!existing) return { success: false, message: "Coupon not found" };

  const parsed = couponFormSchema.safeParse(formData);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid coupon" };

  await prisma.coupon.update({ where: { id: couponId }, data: { ...parsed.data, code: parsed.data.code.toUpperCase(), sellerId: seller.sellerId } });
  revalidatePath("/seller/coupons");
  return { success: true };
}

export async function deleteSellerCouponAction(couponId: string): Promise<ActionResult> {
  const seller = await requireApprovedSeller();
  const result = await prisma.coupon.deleteMany({ where: { id: couponId, sellerId: seller.sellerId } });
  if (result.count === 0) return { success: false, message: "Coupon not found" };
  revalidatePath("/seller/coupons");
  return { success: true };
}

export async function uploadStoreImage(kind: "logo" | "banner", formData: FormData): Promise<ActionResult & { url?: string }> {
  const seller = await requireApprovedSeller();
  const file = formData.get("file");
  if (!(file instanceof File)) return { success: false, message: "No file provided" };

  try {
    validateImageFile({ type: file.type, size: file.size });
  } catch (error) {
    if (error instanceof ImageValidationError) return { success: false, message: error.message };
    throw error;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await getImageService().upload(buffer, { folder: `sellers/${seller.sellerId}/store`, filename: file.name, contentType: file.type });

  await prisma.store.update({ where: { sellerId: seller.sellerId }, data: { [kind === "logo" ? "logoUrl" : "bannerUrl"]: uploaded.url } });
  revalidatePath("/seller/store");
  return { success: true, url: uploaded.url };
}

export async function createShippingZoneAction(formData: { name: string; division?: string; city?: string; flatRate: number }): Promise<ActionResult> {
  const seller = await requireApprovedSeller();
  if (formData.flatRate < 0) return { success: false, message: "Rate must be positive" };
  await prisma.shippingZone.create({ data: { ...formData, sellerId: seller.sellerId } });
  revalidatePath("/seller/settings");
  return { success: true };
}

export async function deleteShippingZoneAction(zoneId: string): Promise<ActionResult> {
  const seller = await requireApprovedSeller();
  await prisma.shippingZone.deleteMany({ where: { id: zoneId, sellerId: seller.sellerId } });
  revalidatePath("/seller/settings");
  return { success: true };
}

export async function updateStoreProfile(formData: {
  name: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
}): Promise<ActionResult> {
  const seller = await requireApprovedSeller();
  await prisma.store.update({ where: { sellerId: seller.sellerId }, data: formData });
  revalidatePath("/seller/store");
  return { success: true };
}
