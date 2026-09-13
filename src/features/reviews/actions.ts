"use server";

import { revalidatePath } from "next/cache";

import { requireUser, requireApprovedSeller, requireAdmin } from "@/lib/rbac";
import { AppError } from "@/lib/api-response";
import { writeAuditLog, AUDIT_ACTIONS } from "@/lib/audit";
import { reviewFormSchema, returnRequestSchema } from "@/validations/review";
import { createReview, moderateReview, replyToReview } from "@/services/review.service";
import { requestReturn, respondToReturn, completeReturnRefund } from "@/services/return.service";
import type { ActionResult } from "@/features/auth/actions";

export async function submitReview(formData: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = reviewFormSchema.safeParse(formData);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid review" };

  try {
    await createReview({ userId: user.id, ...parsed.data });
  } catch (error) {
    if (error instanceof AppError) return { success: false, message: error.message };
    throw error;
  }

  revalidatePath("/orders");
  return { success: true };
}

export async function moderateReviewAction(reviewId: string, status: "APPROVED" | "REJECTED"): Promise<ActionResult> {
  const admin = await requireAdmin();
  await moderateReview(reviewId, status);
  await writeAuditLog({ userId: admin.id, action: AUDIT_ACTIONS.REVIEW_MODERATED, entityType: "Review", entityId: reviewId, metadata: { status } });
  revalidatePath("/admin/reviews");
  return { success: true };
}

export async function replyToReviewAction(reviewId: string, reply: string): Promise<ActionResult> {
  const seller = await requireApprovedSeller();
  try {
    await replyToReview(reviewId, seller.id, reply, seller.sellerId);
  } catch (error) {
    if (error instanceof AppError) return { success: false, message: error.message };
    throw error;
  }
  revalidatePath("/seller/reviews");
  return { success: true };
}

export async function submitReturnRequest(formData: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = returnRequestSchema.safeParse(formData);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid request" };

  try {
    await requestReturn({ userId: user.id, ...parsed.data });
  } catch (error) {
    if (error instanceof AppError) return { success: false, message: error.message };
    throw error;
  }

  revalidatePath("/orders");
  return { success: true };
}

export async function respondToReturnAction(returnRequestId: string, action: "APPROVE" | "REJECT", note?: string): Promise<ActionResult> {
  const seller = await requireApprovedSeller();
  try {
    await respondToReturn(returnRequestId, action, { sellerIdForAuth: seller.sellerId, note });
  } catch (error) {
    if (error instanceof AppError) return { success: false, message: error.message };
    throw error;
  }
  revalidatePath("/seller/orders");
  return { success: true };
}

export async function completeReturnRefundAction(returnRequestId: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await completeReturnRefund(returnRequestId);
  } catch (error) {
    if (error instanceof AppError) return { success: false, message: error.message };
    throw error;
  }
  revalidatePath("/admin/refunds");
  return { success: true };
}
