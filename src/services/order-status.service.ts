import "server-only";

import { Prisma, type OrderStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/api-response";
import { restock } from "@/services/inventory.service";
import { releasePendingEarnings, reversePendingEarnings } from "@/services/payout.service";
import { notifyUser } from "@/services/notification.service";
import { sendTemplateEmail, emailTemplates } from "@/services/email";

const FORWARD_FLOW: OrderStatus[] = ["PENDING", "CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];
const TERMINAL: OrderStatus[] = ["CANCELLED", "RETURNED", "REFUNDED"];
const CANCELLABLE_FROM: OrderStatus[] = ["PENDING", "CONFIRMED", "PROCESSING", "PACKED"];

export function canTransitionSellerOrder(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return false;
  if (TERMINAL.includes(from)) return false;
  if (to === "CANCELLED") return CANCELLABLE_FROM.includes(from);
  if (TERMINAL.includes(to)) return false; // RETURNED/REFUNDED are set by the returns workflow, not this transition
  const fromIdx = FORWARD_FLOW.indexOf(from);
  const toIdx = FORWARD_FLOW.indexOf(to);
  return fromIdx !== -1 && toIdx === fromIdx + 1;
}

/** Recomputes the parent Order's overall status from its suborders (spec §16). */
async function syncOrderAggregateStatus(tx: Prisma.TransactionClient, orderId: string) {
  const sellerOrders = await tx.sellerOrder.findMany({ where: { orderId }, select: { status: true } });
  const statuses = sellerOrders.map((s) => s.status);
  const distinct = new Set(statuses);

  let aggregate: OrderStatus;
  if (distinct.size === 1) {
    aggregate = statuses[0];
  } else if (statuses.every((s) => s === "CANCELLED" || s === "DELIVERED")) {
    aggregate = "DELIVERED"; // mixed cancelled/delivered — the live part completed
  } else {
    const activeRanks = statuses.filter((s) => !TERMINAL.includes(s)).map((s) => FORWARD_FLOW.indexOf(s));
    aggregate = activeRanks.length > 0 ? FORWARD_FLOW[Math.min(...activeRanks)] : "PROCESSING";
  }

  await tx.order.update({ where: { id: orderId }, data: { status: aggregate } });
}

export async function updateSellerOrderStatus(
  sellerOrderId: string,
  newStatus: OrderStatus,
  options: { sellerIdForAuth?: string; note?: string; trackingNumber?: string; shippingCarrier?: string; cancelReason?: string } = {}
) {
  return prisma.$transaction(async (tx) => {
    const sellerOrder = await tx.sellerOrder.findUnique({
      where: { id: sellerOrderId },
      include: { order: { include: { user: true, payment: true } }, items: true },
    });
    if (!sellerOrder) throw new AppError("Order not found", "ORDER_NOT_FOUND", 404);
    if (options.sellerIdForAuth && sellerOrder.sellerId !== options.sellerIdForAuth) {
      throw new AppError("You don't have access to this order", "FORBIDDEN", 403);
    }
    if (!canTransitionSellerOrder(sellerOrder.status, newStatus)) {
      throw new AppError(`Cannot move an order from ${sellerOrder.status} to ${newStatus}`, "INVALID_TRANSITION", 400);
    }

    const now = new Date();
    const updatedSellerOrder = await tx.sellerOrder.update({
      where: { id: sellerOrderId },
      data: {
        status: newStatus,
        trackingNumber: options.trackingNumber ?? sellerOrder.trackingNumber,
        shippingCarrier: options.shippingCarrier ?? sellerOrder.shippingCarrier,
        shippedAt: newStatus === "SHIPPED" ? now : sellerOrder.shippedAt,
        deliveredAt: newStatus === "DELIVERED" ? now : sellerOrder.deliveredAt,
        cancelledAt: newStatus === "CANCELLED" ? now : sellerOrder.cancelledAt,
        cancelReason: newStatus === "CANCELLED" ? options.cancelReason : sellerOrder.cancelReason,
      },
    });

    await tx.orderStatusEvent.create({
      data: { orderId: sellerOrder.orderId, sellerOrderId, status: newStatus, note: options.note },
    });

    if (newStatus === "DELIVERED") {
      await releasePendingEarnings(tx, { sellerId: sellerOrder.sellerId, amount: Number(sellerOrder.payoutTotal), sellerOrderId });
      if (sellerOrder.order.paymentMethod === "COD" && sellerOrder.order.payment?.status !== "PAID") {
        await tx.payment.update({ where: { orderId: sellerOrder.orderId }, data: { status: "PAID", paidAt: now } });
        await tx.order.update({ where: { id: sellerOrder.orderId }, data: { paymentStatus: "PAID" } });
      }
    }

    if (newStatus === "CANCELLED") {
      await restock(
        tx,
        sellerOrder.items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
        "CANCELLATION",
        sellerOrder.subOrderNumber
      );
      await reversePendingEarnings(tx, { sellerId: sellerOrder.sellerId, amount: Number(sellerOrder.payoutTotal), sellerOrderId });
    }

    await syncOrderAggregateStatus(tx, sellerOrder.orderId);

    return { sellerOrder: updatedSellerOrder, customer: sellerOrder.order.user };
  }).then(async ({ sellerOrder, customer }) => {
    await notifyUser({
      userId: customer.id,
      type: "ORDER",
      title: `Order ${sellerOrder.subOrderNumber} ${newStatus.toLowerCase().replace(/_/g, " ")}`,
      message: `Your order ${sellerOrder.subOrderNumber} status changed to ${newStatus.replace(/_/g, " ")}.`,
      link: `/orders/${sellerOrder.orderId}`,
    });

    if (newStatus === "SHIPPED") {
      await sendTemplateEmail(customer.email, emailTemplates.orderShipped(sellerOrder.subOrderNumber, options.trackingNumber));
    } else if (newStatus === "DELIVERED") {
      await sendTemplateEmail(customer.email, emailTemplates.orderDelivered(sellerOrder.subOrderNumber));
    } else if (newStatus === "CANCELLED") {
      await sendTemplateEmail(customer.email, emailTemplates.orderCancelled(sellerOrder.subOrderNumber, options.cancelReason));
    }

    return sellerOrder;
  });
}
