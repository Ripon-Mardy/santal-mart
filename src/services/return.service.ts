import "server-only";

import type { ReturnReason } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/api-response";
import { restock } from "@/services/inventory.service";
import { deductRefundFromWallet } from "@/services/payout.service";
import { getPaymentService } from "@/services/payment";
import { notifyUser } from "@/services/notification.service";

/**
 * Return lifecycle: REQUESTED → APPROVED|REJECTED → (approved only) REFUNDED.
 * PICKUP/RECEIVED remain valid ReturnStatus values for a future courier
 * integration; this demo settles the refund as soon as an admin confirms
 * the item is back, which is enough to exercise the full money/inventory
 * trail without a real logistics provider.
 */

export async function requestReturn(params: {
  userId: string;
  orderItemId: string;
  reason: ReturnReason;
  description?: string;
  images?: string[];
}) {
  const orderItem = await prisma.orderItem.findUnique({
    where: { id: params.orderItemId },
    include: { order: true, sellerOrder: true },
  });
  if (!orderItem || orderItem.order.userId !== params.userId) {
    throw new AppError("Order item not found", "ORDER_ITEM_NOT_FOUND", 404);
  }
  if (orderItem.sellerOrder.status !== "DELIVERED") {
    throw new AppError("Only delivered items can be returned", "NOT_DELIVERED", 400);
  }

  const existing = await prisma.returnRequest.findFirst({
    where: { orderItemId: params.orderItemId, status: { notIn: ["REJECTED"] } },
  });
  if (existing) throw new AppError("A return request already exists for this item", "RETURN_ALREADY_EXISTS", 400);

  return prisma.$transaction(async (tx) => {
    const returnRequest = await tx.returnRequest.create({
      data: {
        orderItemId: params.orderItemId,
        sellerOrderId: orderItem.sellerOrderId,
        userId: params.userId,
        reason: params.reason,
        description: params.description,
        images: params.images,
      },
    });
    await tx.sellerOrder.update({ where: { id: orderItem.sellerOrderId }, data: { status: "RETURN_REQUESTED" } });
    return returnRequest;
  });
}

export async function respondToReturn(
  returnRequestId: string,
  action: "APPROVE" | "REJECT",
  options: { sellerIdForAuth?: string; note?: string } = {}
) {
  const returnRequest = await prisma.returnRequest.findUnique({
    where: { id: returnRequestId },
    include: { sellerOrder: true, user: true, orderItem: true },
  });
  if (!returnRequest) throw new AppError("Return request not found", "RETURN_NOT_FOUND", 404);
  if (options.sellerIdForAuth && returnRequest.sellerOrder.sellerId !== options.sellerIdForAuth) {
    throw new AppError("You don't have access to this return", "FORBIDDEN", 403);
  }
  if (returnRequest.status !== "REQUESTED") {
    throw new AppError("This return request has already been resolved", "ALREADY_RESOLVED", 400);
  }

  const status = action === "APPROVE" ? "APPROVED" : "REJECTED";

  await prisma.$transaction(async (tx) => {
    await tx.returnRequest.update({
      where: { id: returnRequestId },
      data: { status, resolutionNote: options.note, resolvedAt: action === "REJECT" ? new Date() : undefined },
    });
    if (action === "REJECT") {
      await tx.sellerOrder.update({ where: { id: returnRequest.sellerOrderId }, data: { status: "DELIVERED" } });
    }
  });

  await notifyUser({
    userId: returnRequest.userId,
    type: "ORDER",
    title: `Return request ${status.toLowerCase()}`,
    message:
      action === "APPROVE"
        ? "Your return request was approved. Please ship the item back."
        : `Your return request was rejected.${options.note ? ` Reason: ${options.note}` : ""}`,
    link: `/orders/${returnRequest.sellerOrder.orderId}`,
  });

  return status;
}

/** Admin-only: confirms the returned item was received and processes the refund + wallet deduction + restock. */
export async function completeReturnRefund(returnRequestId: string) {
  const returnRequest = await prisma.returnRequest.findUnique({
    where: { id: returnRequestId },
    include: { orderItem: true, sellerOrder: { include: { order: { include: { payment: true } } } }, user: true },
  });
  if (!returnRequest) throw new AppError("Return request not found", "RETURN_NOT_FOUND", 404);
  if (returnRequest.status !== "APPROVED") {
    throw new AppError("Return must be approved before it can be refunded", "NOT_APPROVED", 400);
  }

  const payment = returnRequest.sellerOrder.order.payment;
  if (!payment) throw new AppError("No payment found for this order", "PAYMENT_NOT_FOUND", 404);

  const refundAmount = Number(returnRequest.orderItem.total);

  await prisma.$transaction(async (tx) => {
    await restock(
      tx,
      [{ productId: returnRequest.orderItem.productId, variantId: returnRequest.orderItem.variantId, quantity: returnRequest.orderItem.quantity }],
      "RETURN",
      returnRequest.sellerOrder.subOrderNumber
    );

    await deductRefundFromWallet(tx, {
      sellerId: returnRequest.sellerOrder.sellerId,
      amount: Number(returnRequest.orderItem.sellerEarning),
      sellerOrderId: returnRequest.sellerOrderId,
    });

    await tx.returnRequest.update({ where: { id: returnRequestId }, data: { status: "REFUNDED", resolvedAt: new Date() } });
    await tx.sellerOrder.update({ where: { id: returnRequest.sellerOrderId }, data: { status: "RETURNED" } });

    const alreadyRefunded = await tx.refund.aggregate({ where: { orderId: returnRequest.sellerOrder.orderId }, _sum: { amount: true } });
    const totalRefundedSoFar = Number(alreadyRefunded._sum.amount ?? 0) + refundAmount;
    const orderTotal = Number(returnRequest.sellerOrder.order.total);
    const newPaymentStatus = totalRefundedSoFar >= orderTotal ? "REFUNDED" : "PARTIALLY_REFUNDED";

    await tx.refund.create({
      data: {
        returnRequestId,
        paymentId: payment.id,
        orderId: returnRequest.sellerOrder.orderId,
        amount: refundAmount,
        reason: returnRequest.reason,
        status: "PROCESSED",
        processedAt: new Date(),
      },
    });
    await tx.payment.update({ where: { id: payment.id }, data: { status: newPaymentStatus } });
    await tx.order.update({ where: { id: returnRequest.sellerOrder.orderId }, data: { paymentStatus: newPaymentStatus } });
  });

  await getPaymentService(returnRequest.sellerOrder.order.paymentMethod).refundPayment(payment.providerRef ?? "", refundAmount);

  await notifyUser({
    userId: returnRequest.userId,
    type: "PAYMENT",
    title: "Refund processed",
    message: `Your refund for ${returnRequest.orderItem.productName} has been processed.`,
    link: `/orders/${returnRequest.sellerOrder.orderId}`,
  });
}

/**
 * Admin-initiated refund for a whole order (spec §20 "Admin can ... Refund
 * order") — used for disputes handled outside the customer-filed return
 * flow. Deducts every affected seller's wallet but does not restock, since
 * an admin-issued refund doesn't guarantee the item physically came back.
 */
export async function adminRefundOrder(orderId: string, reason: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payment: true, sellerOrders: true },
  });
  if (!order) throw new AppError("Order not found", "ORDER_NOT_FOUND", 404);
  if (!order.payment) throw new AppError("No payment found for this order", "PAYMENT_NOT_FOUND", 404);
  if (order.payment.status === "REFUNDED") throw new AppError("Order is already fully refunded", "ALREADY_REFUNDED", 400);

  const amount = Number(order.total);

  await prisma.$transaction(async (tx) => {
    for (const sellerOrder of order.sellerOrders) {
      if (Number(sellerOrder.payoutTotal) > 0) {
        await deductRefundFromWallet(tx, { sellerId: sellerOrder.sellerId, amount: Number(sellerOrder.payoutTotal), sellerOrderId: sellerOrder.id });
      }
      await tx.sellerOrder.update({ where: { id: sellerOrder.id }, data: { status: "REFUNDED" } });
    }

    await tx.refund.create({
      data: { paymentId: order.payment!.id, orderId, amount, reason, status: "PROCESSED", processedAt: new Date() },
    });
    await tx.payment.update({ where: { id: order.payment!.id }, data: { status: "REFUNDED" } });
    await tx.order.update({ where: { id: orderId }, data: { paymentStatus: "REFUNDED", status: "REFUNDED" } });
  });

  await getPaymentService(order.paymentMethod).refundPayment(order.payment.providerRef ?? "", amount);

  await notifyUser({
    userId: order.userId,
    type: "PAYMENT",
    title: "Order refunded",
    message: `Your order ${order.orderNumber} has been refunded. Reason: ${reason}`,
    link: `/orders/${orderId}`,
  });
}
