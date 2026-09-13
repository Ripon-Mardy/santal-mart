"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSuperAdmin } from "@/lib/rbac";
import { AppError } from "@/lib/api-response";
import { writeAuditLog, AUDIT_ACTIONS } from "@/lib/audit";
import { generateUniqueSlug } from "@/lib/slug";
import { categorySchema, brandSchema } from "@/validations/product";
import { couponFormSchema } from "@/validations/checkout";
import { approveSeller, rejectSeller, suspendSeller, reactivateSeller } from "@/services/seller.service";
import { approveProduct, rejectProduct, archiveProduct } from "@/services/product-moderation.service";
import { approvePayout, rejectPayout, markPayoutPaid } from "@/services/payout.service";
import { adminRefundOrder, completeReturnRefund } from "@/services/return.service";
import { setGlobalCommissionRate } from "@/services/commission.service";
import { getImageService, validateImageFile, ImageValidationError } from "@/services/image";
import type { ActionResult } from "@/features/auth/actions";

type UploadImageResult = { success: true; url: string } | { success: false; message: string };

function handleActionError(error: unknown): ActionResult {
  if (error instanceof AppError) return { success: false, message: error.message };
  throw error;
}

// ── Sellers ──────────────────────────────────────────────────────

export async function approveSellerAction(sellerId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  try {
    await approveSeller(sellerId, admin.id);
  } catch (error) {
    return handleActionError(error);
  }
  revalidatePath("/admin/sellers");
  return { success: true };
}

export async function rejectSellerAction(sellerId: string, reason: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!reason.trim()) return { success: false, message: "A rejection reason is required" };
  try {
    await rejectSeller(sellerId, admin.id, reason);
  } catch (error) {
    return handleActionError(error);
  }
  revalidatePath("/admin/sellers");
  return { success: true };
}

export async function suspendSellerAction(sellerId: string, reason?: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  try {
    await suspendSeller(sellerId, admin.id, reason);
  } catch (error) {
    return handleActionError(error);
  }
  revalidatePath("/admin/sellers");
  return { success: true };
}

export async function reactivateSellerAction(sellerId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  try {
    await reactivateSeller(sellerId, admin.id);
  } catch (error) {
    return handleActionError(error);
  }
  revalidatePath("/admin/sellers");
  return { success: true };
}

export async function setSellerCommissionAction(sellerId: string, rate: number | null): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (rate === null) {
    await prisma.commission.deleteMany({ where: { sellerId } });
  } else {
    await prisma.commission.upsert({
      where: { sellerId },
      update: { rate },
      create: { scope: "SELLER", sellerId, rate },
    });
  }
  await writeAuditLog({ userId: admin.id, action: AUDIT_ACTIONS.COMMISSION_UPDATED, entityType: "Seller", entityId: sellerId, metadata: { rate } });
  revalidatePath("/admin/sellers");
  return { success: true };
}

// ── Products ─────────────────────────────────────────────────────

export async function approveProductAction(productId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  try {
    await approveProduct(productId, admin.id);
  } catch (error) {
    return handleActionError(error);
  }
  revalidatePath("/admin/products");
  return { success: true };
}

export async function rejectProductAction(productId: string, reason: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!reason.trim()) return { success: false, message: "A rejection reason is required" };
  try {
    await rejectProduct(productId, admin.id, reason);
  } catch (error) {
    return handleActionError(error);
  }
  revalidatePath("/admin/products");
  return { success: true };
}

export async function archiveProductAction(productId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  await archiveProduct(productId, admin.id);
  revalidatePath("/admin/products");
  return { success: true };
}

export async function uploadAdminImage(folder: string, formData: FormData): Promise<UploadImageResult> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File)) return { success: false, message: "No file provided" };

  try {
    validateImageFile({ type: file.type, size: file.size });
  } catch (error) {
    if (error instanceof ImageValidationError) return { success: false, message: error.message };
    throw error;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await getImageService().upload(buffer, { folder: `admin/${folder}`, filename: file.name, contentType: file.type });
  return { success: true, url: uploaded.url };
}

// ── Categories ───────────────────────────────────────────────────

export async function createCategoryAction(formData: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = categorySchema.safeParse(formData);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid category" };

  const slug = await generateUniqueSlug(parsed.data.name, async (candidate) => !!(await prisma.category.findUnique({ where: { slug: candidate } })));

  const category = await prisma.category.create({
    data: { ...parsed.data, parentId: parsed.data.parentId || null, description: parsed.data.description || null, imageUrl: parsed.data.imageUrl || null, slug },
  });
  await writeAuditLog({ userId: admin.id, action: AUDIT_ACTIONS.CATEGORY_CREATED, entityType: "Category", entityId: category.id });
  revalidatePath("/admin/categories");
  return { success: true };
}

export async function updateCategoryAction(categoryId: string, formData: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = categorySchema.safeParse(formData);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid category" };
  if (parsed.data.parentId === categoryId) return { success: false, message: "A category can't be its own parent" };

  await prisma.category.update({
    where: { id: categoryId },
    data: { ...parsed.data, parentId: parsed.data.parentId || null, description: parsed.data.description || null, imageUrl: parsed.data.imageUrl || null },
  });
  await writeAuditLog({ userId: admin.id, action: AUDIT_ACTIONS.CATEGORY_UPDATED, entityType: "Category", entityId: categoryId });
  revalidatePath("/admin/categories");
  return { success: true };
}

export async function deleteCategoryAction(categoryId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const productCount = await prisma.product.count({ where: { categoryId } });
  if (productCount > 0) return { success: false, message: "Move or remove products from this category first" };
  const childCount = await prisma.category.count({ where: { parentId: categoryId } });
  if (childCount > 0) return { success: false, message: "Delete or reassign subcategories first" };

  await prisma.category.delete({ where: { id: categoryId } });
  await writeAuditLog({ userId: admin.id, action: AUDIT_ACTIONS.CATEGORY_DELETED, entityType: "Category", entityId: categoryId });
  revalidatePath("/admin/categories");
  return { success: true };
}

// ── Brands ───────────────────────────────────────────────────────

export async function createBrandAction(formData: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = brandSchema.safeParse(formData);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid brand" };

  const slug = await generateUniqueSlug(parsed.data.name, async (candidate) => !!(await prisma.brand.findUnique({ where: { slug: candidate } })));
  const brand = await prisma.brand.create({ data: { ...parsed.data, description: parsed.data.description || null, logoUrl: parsed.data.logoUrl || null, slug } });
  await writeAuditLog({ userId: admin.id, action: AUDIT_ACTIONS.BRAND_CREATED, entityType: "Brand", entityId: brand.id });
  revalidatePath("/admin/brands");
  return { success: true };
}

export async function updateBrandAction(brandId: string, formData: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = brandSchema.safeParse(formData);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid brand" };

  await prisma.brand.update({ where: { id: brandId }, data: { ...parsed.data, description: parsed.data.description || null, logoUrl: parsed.data.logoUrl || null } });
  await writeAuditLog({ userId: admin.id, action: AUDIT_ACTIONS.BRAND_UPDATED, entityType: "Brand", entityId: brandId });
  revalidatePath("/admin/brands");
  return { success: true };
}

export async function deleteBrandAction(brandId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const productCount = await prisma.product.count({ where: { brandId } });
  if (productCount > 0) return { success: false, message: "Remove this brand from products first" };
  await prisma.brand.delete({ where: { id: brandId } });
  await writeAuditLog({ userId: admin.id, action: AUDIT_ACTIONS.BRAND_DELETED, entityType: "Brand", entityId: brandId });
  revalidatePath("/admin/brands");
  return { success: true };
}

// ── Banners ──────────────────────────────────────────────────────

export async function createBannerAction(formData: {
  title: string;
  subtitle?: string;
  imageUrl: string;
  ctaText?: string;
  ctaUrl?: string;
  type: "HERO" | "PROMOTIONAL" | "CATEGORY";
  startsAt?: Date;
  endsAt?: Date;
  isActive: boolean;
  sortOrder: number;
}): Promise<ActionResult> {
  const admin = await requireAdmin();
  const banner = await prisma.banner.create({ data: formData });
  await writeAuditLog({ userId: admin.id, action: AUDIT_ACTIONS.BANNER_CREATED, entityType: "Banner", entityId: banner.id });
  revalidatePath("/admin/banners");
  revalidatePath("/");
  return { success: true };
}

export async function updateBannerAction(bannerId: string, formData: Partial<{
  title: string; subtitle: string; imageUrl: string; ctaText: string; ctaUrl: string;
  type: "HERO" | "PROMOTIONAL" | "CATEGORY"; startsAt: Date | null; endsAt: Date | null; isActive: boolean; sortOrder: number;
}>): Promise<ActionResult> {
  const admin = await requireAdmin();
  await prisma.banner.update({ where: { id: bannerId }, data: formData });
  await writeAuditLog({ userId: admin.id, action: AUDIT_ACTIONS.BANNER_UPDATED, entityType: "Banner", entityId: bannerId });
  revalidatePath("/admin/banners");
  revalidatePath("/");
  return { success: true };
}

export async function deleteBannerAction(bannerId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  await prisma.banner.delete({ where: { id: bannerId } });
  await writeAuditLog({ userId: admin.id, action: AUDIT_ACTIONS.BANNER_DELETED, entityType: "Banner", entityId: bannerId });
  revalidatePath("/admin/banners");
  revalidatePath("/");
  return { success: true };
}

// ── Coupons ──────────────────────────────────────────────────────

export async function createCouponAction(formData: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = couponFormSchema.safeParse(formData);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid coupon" };

  const existing = await prisma.coupon.findUnique({ where: { code: parsed.data.code.toUpperCase() } });
  if (existing) return { success: false, message: "This coupon code already exists" };

  const coupon = await prisma.coupon.create({ data: { ...parsed.data, code: parsed.data.code.toUpperCase() } });
  await writeAuditLog({ userId: admin.id, action: AUDIT_ACTIONS.COUPON_CREATED, entityType: "Coupon", entityId: coupon.id });
  revalidatePath("/admin/coupons");
  return { success: true };
}

export async function updateCouponAction(couponId: string, formData: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = couponFormSchema.safeParse(formData);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid coupon" };

  await prisma.coupon.update({ where: { id: couponId }, data: { ...parsed.data, code: parsed.data.code.toUpperCase() } });
  await writeAuditLog({ userId: admin.id, action: AUDIT_ACTIONS.COUPON_UPDATED, entityType: "Coupon", entityId: couponId });
  revalidatePath("/admin/coupons");
  return { success: true };
}

export async function deleteCouponAction(couponId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  await prisma.coupon.delete({ where: { id: couponId } });
  await writeAuditLog({ userId: admin.id, action: AUDIT_ACTIONS.COUPON_DELETED, entityType: "Coupon", entityId: couponId });
  revalidatePath("/admin/coupons");
  return { success: true };
}

// ── Commission / Payouts / Refunds ──────────────────────────────

export async function setGlobalCommissionAction(rate: number): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (rate < 0 || rate > 100) return { success: false, message: "Rate must be between 0 and 100" };
  await setGlobalCommissionRate(rate);
  await writeAuditLog({ userId: admin.id, action: AUDIT_ACTIONS.COMMISSION_UPDATED, entityType: "Setting", entityId: "commission.globalRate", metadata: { rate } });
  revalidatePath("/admin/commissions");
  return { success: true };
}

export async function setCategoryCommissionAction(categoryId: string, rate: number | null): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (rate === null) {
    await prisma.commission.deleteMany({ where: { categoryId } });
  } else {
    await prisma.commission.upsert({ where: { categoryId }, update: { rate }, create: { scope: "CATEGORY", categoryId, rate } });
  }
  await writeAuditLog({ userId: admin.id, action: AUDIT_ACTIONS.COMMISSION_UPDATED, entityType: "Category", entityId: categoryId, metadata: { rate } });
  revalidatePath("/admin/commissions");
  return { success: true };
}

export async function approvePayoutAction(payoutId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  await approvePayout(payoutId);
  await writeAuditLog({ userId: admin.id, action: AUDIT_ACTIONS.PAYOUT_APPROVED, entityType: "Payout", entityId: payoutId });
  revalidatePath("/admin/payouts");
  return { success: true };
}

export async function rejectPayoutAction(payoutId: string, reason: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!reason.trim()) return { success: false, message: "A reason is required" };
  await rejectPayout(payoutId, reason);
  await writeAuditLog({ userId: admin.id, action: AUDIT_ACTIONS.PAYOUT_REJECTED, entityType: "Payout", entityId: payoutId, metadata: { reason } });
  revalidatePath("/admin/payouts");
  return { success: true };
}

export async function markPayoutPaidAction(payoutId: string, note?: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  await markPayoutPaid(payoutId, note);
  await writeAuditLog({ userId: admin.id, action: AUDIT_ACTIONS.PAYOUT_MARKED_PAID, entityType: "Payout", entityId: payoutId });
  revalidatePath("/admin/payouts");
  return { success: true };
}

export async function adminRefundOrderAction(orderId: string, reason: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!reason.trim()) return { success: false, message: "A refund reason is required" };
  try {
    await adminRefundOrder(orderId, reason);
  } catch (error) {
    return handleActionError(error);
  }
  await writeAuditLog({ userId: admin.id, action: AUDIT_ACTIONS.ORDER_REFUNDED, entityType: "Order", entityId: orderId, metadata: { reason } });
  revalidatePath("/admin/orders");
  revalidatePath("/admin/refunds");
  return { success: true };
}

export async function adminCompleteReturnRefundAction(returnRequestId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  try {
    await completeReturnRefund(returnRequestId);
  } catch (error) {
    return handleActionError(error);
  }
  await writeAuditLog({ userId: admin.id, action: AUDIT_ACTIONS.ORDER_REFUNDED, entityType: "ReturnRequest", entityId: returnRequestId });
  revalidatePath("/admin/refunds");
  return { success: true };
}

// ── Users ────────────────────────────────────────────────────────

export async function suspendUserAction(userId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { success: false, message: "User not found" };
  if (target.role === "SUPER_ADMIN") return { success: false, message: "Super admins can't be suspended" };

  await prisma.user.update({ where: { id: userId }, data: { status: "SUSPENDED" } });
  await writeAuditLog({ userId: admin.id, action: AUDIT_ACTIONS.USER_SUSPENDED, entityType: "User", entityId: userId });
  revalidatePath("/admin/users");
  return { success: true };
}

export async function activateUserAction(userId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  await prisma.user.update({ where: { id: userId }, data: { status: "ACTIVE" } });
  await writeAuditLog({ userId: admin.id, action: AUDIT_ACTIONS.USER_ACTIVATED, entityType: "User", entityId: userId });
  revalidatePath("/admin/users");
  return { success: true };
}

/** Promoting to ADMIN is a SUPER_ADMIN-only action (spec §30 — never let a regular admin mint another admin). */
export async function changeUserRoleAction(userId: string, role: "CUSTOMER" | "ADMIN"): Promise<ActionResult> {
  const superAdmin = await requireSuperAdmin();
  await prisma.user.update({ where: { id: userId }, data: { role } });
  await writeAuditLog({ userId: superAdmin.id, action: AUDIT_ACTIONS.SETTINGS_CHANGED, entityType: "User", entityId: userId, metadata: { newRole: role } });
  revalidatePath("/admin/users");
  return { success: true };
}

export async function toggleFeatureFlagAction(key: string, isEnabled: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  await prisma.featureFlag.update({ where: { key }, data: { isEnabled } });
  await writeAuditLog({ userId: admin.id, action: AUDIT_ACTIONS.FEATURE_FLAG_TOGGLED, entityType: "FeatureFlag", entityId: key, metadata: { isEnabled } });
  revalidatePath("/admin/settings");
  return { success: true };
}

export async function updateSettingAction(key: string, value: string, group?: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  await prisma.setting.upsert({ where: { key }, update: { value, group }, create: { key, value, group } });
  await writeAuditLog({ userId: admin.id, action: AUDIT_ACTIONS.SETTINGS_CHANGED, entityType: "Setting", entityId: key });
  revalidatePath("/admin/settings");
  return { success: true };
}
