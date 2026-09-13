import { describe, expect, it, afterAll } from "vitest";

import { prisma } from "@/lib/prisma";
import { validateCoupon, CouponError, recordCouponUsage } from "@/services/coupon.service";
import { createTestCategory, createTestSeller, createTestProduct, createTestCustomer, unique } from "./test-helpers";

describe("validateCoupon", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function setup() {
    const category = await createTestCategory();
    const { seller, store } = await createTestSeller();
    const { product } = await createTestProduct({ sellerId: seller.id, storeId: store.id, categoryId: category.id, price: 1000 });
    const customer = await createTestCustomer();
    const lines = [{ productId: product.id, categoryId: category.id, sellerId: seller.id, lineTotal: 1000 }];
    return { category, seller, product, customer, lines };
  }

  it("rejects an unknown coupon code", async () => {
    const { customer, lines } = await setup();
    await expect(validateCoupon("DOES-NOT-EXIST", customer.id, lines)).rejects.toBeInstanceOf(CouponError);
  });

  it("applies a percentage discount within the cap", async () => {
    const { customer, lines } = await setup();
    const code = unique("PCT10");
    await prisma.coupon.create({
      data: { code, discountType: "PERCENTAGE", value: 10, startsAt: new Date(Date.now() - 86_400_000), endsAt: new Date(Date.now() + 86_400_000) },
    });

    const result = await validateCoupon(code, customer.id, lines);
    expect(result.discountAmount).toBe(100);
  });

  it("caps a percentage discount at maxDiscount", async () => {
    const { customer, lines } = await setup();
    const code = unique("PCT50CAP");
    await prisma.coupon.create({
      data: { code, discountType: "PERCENTAGE", value: 50, maxDiscount: 50, startsAt: new Date(Date.now() - 86_400_000), endsAt: new Date(Date.now() + 86_400_000) },
    });

    const result = await validateCoupon(code, customer.id, lines);
    expect(result.discountAmount).toBe(50);
  });

  it("rejects an expired coupon", async () => {
    const { customer, lines } = await setup();
    const code = unique("EXPIRED");
    await prisma.coupon.create({
      data: { code, discountType: "PERCENTAGE", value: 10, startsAt: new Date(Date.now() - 20 * 86_400_000), endsAt: new Date(Date.now() - 86_400_000) },
    });

    await expect(validateCoupon(code, customer.id, lines)).rejects.toThrow(/expired/i);
  });

  it("rejects an order below the minimum order amount", async () => {
    const { customer, lines } = await setup();
    const code = unique("MINORDER");
    await prisma.coupon.create({
      data: { code, discountType: "FIXED_AMOUNT", value: 100, minOrderAmount: 5000, startsAt: new Date(Date.now() - 86_400_000), endsAt: new Date(Date.now() + 86_400_000) },
    });

    await expect(validateCoupon(code, customer.id, lines)).rejects.toThrow(/minimum/i);
  });

  it("enforces the per-user usage limit", async () => {
    const { customer, lines } = await setup();
    const code = unique("ONCEPERUSER");
    const coupon = await prisma.coupon.create({
      data: { code, discountType: "FIXED_AMOUNT", value: 50, perUserLimit: 1, startsAt: new Date(Date.now() - 86_400_000), endsAt: new Date(Date.now() + 86_400_000) },
    });

    // Simulate a prior use directly (no real order needed for this check).
    const order = await prisma.order.create({
      data: {
        orderNumber: unique("BXTEST"),
        userId: customer.id,
        addressId: (await prisma.address.create({ data: { userId: customer.id, fullName: "T", phone: "0100000000", line1: "x", city: "Dhaka", division: "Dhaka" } })).id,
        subtotal: 1000,
        total: 1000,
        paymentMethod: "COD",
      },
    });
    await recordCouponUsage(prisma as never, { couponId: coupon.id, userId: customer.id, orderId: order.id, discountAmount: 50 });

    await expect(validateCoupon(code, customer.id, lines)).rejects.toThrow(/maximum number of times/i);
  });

  it("only discounts items matching a seller-specific coupon", async () => {
    const category = await createTestCategory();
    const sellerA = await createTestSeller();
    const sellerB = await createTestSeller();
    const { product: productA } = await createTestProduct({ sellerId: sellerA.seller.id, storeId: sellerA.store.id, categoryId: category.id, price: 500 });
    const { product: productB } = await createTestProduct({ sellerId: sellerB.seller.id, storeId: sellerB.store.id, categoryId: category.id, price: 500 });
    const customer = await createTestCustomer();

    const code = unique("SELLERONLY");
    await prisma.coupon.create({
      data: { code, discountType: "PERCENTAGE", value: 20, sellerId: sellerA.seller.id, startsAt: new Date(Date.now() - 86_400_000), endsAt: new Date(Date.now() + 86_400_000) },
    });

    const lines = [
      { productId: productA.id, categoryId: category.id, sellerId: sellerA.seller.id, lineTotal: 500 },
      { productId: productB.id, categoryId: category.id, sellerId: sellerB.seller.id, lineTotal: 500 },
    ];

    const result = await validateCoupon(code, customer.id, lines);
    // 20% of only seller A's ৳500 line — not the combined ৳1000 cart.
    expect(result.discountAmount).toBe(100);
  });
});
