import "server-only";

import type { PaymentMethod } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/api-response";
import { generateOrderNumber, generateSubOrderNumber } from "@/lib/order-number";
import { toNumber } from "@/lib/currency";
import { reserveAndSell, InsufficientStockError } from "@/services/inventory.service";
import { getEffectiveCommissionRate, calculateCommission } from "@/services/commission.service";
import { resolveShippingFee } from "@/services/shipping.service";
import { validateCoupon, recordCouponUsage, CouponError } from "@/services/coupon.service";
import { creditPendingEarnings } from "@/services/payout.service";
import { getPaymentService } from "@/services/payment";
import { notifyUser } from "@/services/notification.service";
import { sendTemplateEmail, emailTemplates } from "@/services/email";
import { formatCurrency } from "@/lib/currency";

export { InsufficientStockError };

export type CheckoutLine = { productId: string; variantId?: string | null; quantity: number };

export type CreateOrderInput = {
  userId: string;
  addressId: string;
  billingAddressId?: string;
  paymentMethod: PaymentMethod;
  couponCode?: string;
  notes?: string;
  lines: CheckoutLine[];
};

/**
 * The core checkout transaction. Everything here happens atomically — if
 * inventory can't be reserved, the coupon is invalid, or anything else
 * fails, nothing is written (spec §16, §65-66): the order, its per-seller
 * suborders, inventory movements, commission snapshots, and pending wallet
 * credits all commit together or not at all.
 */
export async function createOrder(input: CreateOrderInput) {
  if (input.lines.length === 0) {
    throw new AppError("Your cart is empty", "EMPTY_CART", 400);
  }

  const result = await prisma.$transaction(
    async (tx) => {
      const address = await tx.address.findFirst({ where: { id: input.addressId, userId: input.userId } });
      if (!address) throw new AppError("Delivery address not found", "ADDRESS_NOT_FOUND", 404);

      const productIds = [...new Set(input.lines.map((l) => l.productId))];
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        include: {
          variants: true,
          seller: { select: { id: true, status: true, userId: true } },
          images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 },
        },
      });
      const productMap = new Map(products.map((p) => [p.id, p]));

      type ResolvedLine = {
        productId: string;
        variantId: string | null;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
        sellerId: string;
        sellerUserId: string;
        categoryId: string;
        name: string;
        variantName: string | null;
        sku: string;
        image: string | null;
      };

      const resolvedLines: ResolvedLine[] = [];

      for (const line of input.lines) {
        const product = productMap.get(line.productId);
        if (!product) throw new AppError("One of the items in your cart no longer exists", "PRODUCT_NOT_FOUND", 404);
        if (product.status !== "APPROVED" || !product.isPublished) {
          throw new AppError(`"${product.name}" is not currently available for purchase`, "PRODUCT_UNAVAILABLE", 400);
        }
        if (product.seller.status !== "APPROVED") {
          throw new AppError(`"${product.name}" is temporarily unavailable`, "SELLER_UNAVAILABLE", 400);
        }
        if (line.quantity < 1) throw new AppError("Quantity must be at least 1", "INVALID_QUANTITY", 400);

        const variant = line.variantId ? product.variants.find((v) => v.id === line.variantId) : undefined;
        if (line.variantId && !variant) {
          throw new AppError("Selected variant is no longer available", "VARIANT_NOT_FOUND", 404);
        }

        const unitPrice = toNumber(variant?.price ?? product.price);
        resolvedLines.push({
          productId: product.id,
          variantId: variant?.id ?? null,
          quantity: line.quantity,
          unitPrice,
          lineTotal: Math.round(unitPrice * line.quantity * 100) / 100,
          sellerId: product.sellerId,
          sellerUserId: product.seller.userId,
          categoryId: product.categoryId,
          name: product.name,
          variantName: variant?.name ?? null,
          sku: variant?.sku ?? product.sku,
          image: product.images[0]?.url ?? null,
        });
      }

      const sellerIds = [...new Set(resolvedLines.map((l) => l.sellerId))];

      let coupon: Awaited<ReturnType<typeof validateCoupon>> | null = null;
      if (input.couponCode) {
        try {
          coupon = await validateCoupon(
            input.couponCode,
            input.userId,
            resolvedLines.map((l) => ({ productId: l.productId, categoryId: l.categoryId, sellerId: l.sellerId, lineTotal: l.lineTotal })),
            tx
          );
        } catch (error) {
          if (error instanceof CouponError) throw new AppError(error.message, "INVALID_COUPON", 400);
          throw error;
        }
      }

      const shippingBySeller = new Map<string, number>();
      for (const sellerId of sellerIds) {
        const fee = coupon?.freeShipping ? 0 : await resolveShippingFee(sellerId, { division: address.division, city: address.city }, tx);
        shippingBySeller.set(sellerId, fee);
      }

      const subtotal = round2(resolvedLines.reduce((sum, l) => sum + l.lineTotal, 0));
      const shippingTotal = round2([...shippingBySeller.values()].reduce((sum, f) => sum + f, 0));
      const discountTotal = round2(coupon?.discountAmount ?? 0);
      const total = round2(subtotal + shippingTotal - discountTotal);

      const orderNumber = generateOrderNumber();

      // Guarded, atomic stock check — throws InsufficientStockError and
      // aborts the whole transaction if any line can't be fulfilled.
      await reserveAndSell(
        tx,
        resolvedLines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity })),
        orderNumber
      );

      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: input.userId,
          addressId: input.addressId,
          billingAddressId: input.billingAddressId ?? input.addressId,
          subtotal,
          shippingTotal,
          discountTotal,
          tax: 0,
          total,
          couponId: coupon?.couponId,
          couponCode: coupon?.code,
          paymentMethod: input.paymentMethod,
          notes: input.notes,
        },
      });

      const sellerOrderSummaries: { id: string; sellerId: string; sellerUserId: string; subOrderNumber: string; payoutTotal: number }[] = [];

      let subIndex = 0;
      for (const sellerId of sellerIds) {
        const sellerLines = resolvedLines.filter((l) => l.sellerId === sellerId);
        const sellerSubtotal = round2(sellerLines.reduce((sum, l) => sum + l.lineTotal, 0));
        const sellerShipping = shippingBySeller.get(sellerId) ?? 0;
        const discountShare = subtotal > 0 ? round2(discountTotal * (sellerSubtotal / subtotal)) : 0;

        const sellerOrder = await tx.sellerOrder.create({
          data: {
            orderId: order.id,
            sellerId,
            subOrderNumber: generateSubOrderNumber(orderNumber, subIndex++),
            subtotal: sellerSubtotal,
            shippingFee: sellerShipping,
            discountShare,
          },
        });

        let commissionTotal = 0;
        let itemsEarning = 0;
        for (const line of sellerLines) {
          const rate = await getEffectiveCommissionRate({ sellerId, categoryId: line.categoryId }, tx);
          const { commissionAmount, sellerEarning } = calculateCommission(line.lineTotal, rate);
          commissionTotal += commissionAmount;
          itemsEarning += sellerEarning;

          await tx.orderItem.create({
            data: {
              orderId: order.id,
              sellerOrderId: sellerOrder.id,
              productId: line.productId,
              variantId: line.variantId,
              productName: line.name,
              variantName: line.variantName,
              sku: line.sku,
              image: line.image,
              price: line.unitPrice,
              quantity: line.quantity,
              total: line.lineTotal,
              commissionRate: rate,
              commissionAmount,
              sellerEarning,
            },
          });
        }

        // The seller keeps the shipping fee they charge (no commission on
        // shipping) and absorbs their proportional share of any coupon
        // discount given to the customer.
        const payoutTotal = round2(itemsEarning + sellerShipping - discountShare);

        await tx.sellerOrder.update({
          where: { id: sellerOrder.id },
          data: { commissionTotal: round2(commissionTotal), payoutTotal },
        });
        await tx.orderStatusEvent.create({ data: { orderId: order.id, sellerOrderId: sellerOrder.id, status: "PENDING" } });
        await creditPendingEarnings(tx, { sellerId, amount: payoutTotal, sellerOrderId: sellerOrder.id });

        sellerOrderSummaries.push({
          id: sellerOrder.id,
          sellerId,
          sellerUserId: productMap.get(sellerLines[0].productId)!.seller.userId,
          subOrderNumber: sellerOrder.subOrderNumber,
          payoutTotal,
        });
      }

      await tx.orderStatusEvent.create({ data: { orderId: order.id, status: "PENDING" } });

      if (coupon) {
        await recordCouponUsage(tx, { couponId: coupon.couponId, userId: input.userId, orderId: order.id, discountAmount: discountTotal });
      }

      const provider = getPaymentService(input.paymentMethod);
      const paymentResult = await provider.createPayment({ orderId: order.id, orderNumber, amount: total, currency: "BDT" });

      await tx.payment.create({
        data: {
          orderId: order.id,
          provider: input.paymentMethod === "COD" ? "COD" : "MOCK",
          method: input.paymentMethod,
          amount: total,
          status: paymentResult.status,
          providerRef: paymentResult.providerRef,
          paidAt: paymentResult.status === "PAID" ? new Date() : null,
        },
      });

      await tx.order.update({ where: { id: order.id }, data: { paymentStatus: paymentResult.status, status: "CONFIRMED" } });
      await tx.orderStatusEvent.create({ data: { orderId: order.id, status: "CONFIRMED" } });

      await tx.cartItem.deleteMany({
        where: {
          cart: { userId: input.userId },
          productId: { in: resolvedLines.map((l) => l.productId) },
        },
      });

      return { order, sellerOrders: sellerOrderSummaries, customerName: undefined as string | undefined };
    },
    { maxWait: 10_000, timeout: 20_000 }
  );

  // Side effects that must NOT roll back the order if they fail.
  const customer = await prisma.user.findUnique({ where: { id: input.userId } });
  if (customer) {
    await sendTemplateEmail(customer.email, emailTemplates.orderConfirmation(customer.name, result.order.orderNumber, formatCurrency(toNumber(result.order.total))));
    await notifyUser({
      userId: customer.id,
      type: "ORDER",
      title: "Order placed",
      message: `Your order ${result.order.orderNumber} has been placed.`,
      link: `/orders/${result.order.id}`,
    });
  }

  for (const so of result.sellerOrders) {
    await notifyUser({
      userId: so.sellerUserId,
      type: "ORDER",
      title: "New order received",
      message: `You have a new order ${so.subOrderNumber}.`,
      link: `/seller/orders/${so.id}`,
    });
  }

  return result.order;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}
