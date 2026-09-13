import { describe, expect, it, afterAll } from "vitest";

import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/api-response";
import { createOrder } from "@/services/order.service";
import { updateSellerOrderStatus } from "@/services/order-status.service";
import { createTestCategory, createTestSeller, createTestProduct, createTestCustomer, createTestAddress } from "./test-helpers";

/**
 * Spec §68: "A seller must NEVER be able to ... Edit another seller's
 * products / View another seller's orders." Server-side enforcement lives
 * in order-status.service.ts's `sellerIdForAuth` check — this proves it
 * actually rejects a cross-seller update rather than trusting the caller.
 */
describe("cross-seller authorization boundary", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rejects a seller trying to update another seller's suborder", async () => {
    const category = await createTestCategory();
    const ownerSeller = await createTestSeller();
    const intruderSeller = await createTestSeller();
    const { product } = await createTestProduct({ sellerId: ownerSeller.seller.id, storeId: ownerSeller.store.id, categoryId: category.id, price: 500, stock: 10 });
    const customer = await createTestCustomer();
    const address = await createTestAddress(customer.id);

    const order = await createOrder({
      userId: customer.id,
      addressId: address.id,
      paymentMethod: "COD",
      lines: [{ productId: product.id, quantity: 1 }],
    });

    const sellerOrder = await prisma.sellerOrder.findFirstOrThrow({ where: { orderId: order.id } });
    expect(sellerOrder.sellerId).toBe(ownerSeller.seller.id);

    await expect(
      updateSellerOrderStatus(sellerOrder.id, "CONFIRMED", { sellerIdForAuth: intruderSeller.seller.id })
    ).rejects.toBeInstanceOf(AppError);

    // The legitimate owner can still update it.
    const updated = await updateSellerOrderStatus(sellerOrder.id, "CONFIRMED", { sellerIdForAuth: ownerSeller.seller.id });
    expect(updated.status).toBe("CONFIRMED");
  });
});
