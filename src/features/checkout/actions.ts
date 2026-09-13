"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/api-response";
import { checkoutSchema } from "@/validations/checkout";
import { getCartForUser } from "@/features/cart/queries";
import { createOrder, InsufficientStockError } from "@/services/order.service";
import { validateCoupon, CouponError } from "@/services/coupon.service";
import type { ActionResult } from "@/features/auth/actions";

export async function placeOrder(formData: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = checkoutSchema.safeParse(formData);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid checkout data" };

  const cart = await getCartForUser(user.id);
  if (cart.groups.length === 0) return { success: false, message: "Your cart is empty" };

  const lines = cart.groups.flatMap((g) => g.items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })));

  let orderId: string;
  try {
    const order = await createOrder({
      userId: user.id,
      addressId: parsed.data.addressId,
      billingAddressId: parsed.data.billingAddressId,
      paymentMethod: parsed.data.paymentMethod,
      couponCode: parsed.data.couponCode || undefined,
      notes: parsed.data.notes || undefined,
      lines,
    });
    orderId = order.id;
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return { success: false, message: "One of the items in your cart just went out of stock. Please review your cart." };
    }
    if (error instanceof AppError) {
      return { success: false, message: error.message };
    }
    throw error;
  }

  revalidatePath("/cart");
  revalidatePath("/orders");
  redirect(`/orders/${orderId}?placed=1`);
}

export type CouponPreview = { success: true; discountAmount: number; freeShipping: boolean } | { success: false; message: string };

export async function previewCoupon(code: string): Promise<CouponPreview> {
  const user = await requireUser();
  const cart = await getCartForUser(user.id);

  const productIds = cart.groups.flatMap((g) => g.items.map((i) => i.productId));
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, categoryId: true, sellerId: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const lines = cart.groups.flatMap((g) =>
    g.items.map((i) => ({
      productId: i.productId,
      categoryId: productMap.get(i.productId)?.categoryId ?? "",
      sellerId: productMap.get(i.productId)?.sellerId ?? "",
      lineTotal: i.lineTotal,
    }))
  );

  try {
    const result = await validateCoupon(code, user.id, lines);
    return { success: true, discountAmount: result.discountAmount, freeShipping: result.freeShipping };
  } catch (error) {
    if (error instanceof CouponError) return { success: false, message: error.message };
    throw error;
  }
}
