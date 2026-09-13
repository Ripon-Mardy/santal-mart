import { describe, expect, it, afterAll } from "vitest";

import { prisma } from "@/lib/prisma";
import { reserveAndSell, InsufficientStockError } from "@/services/inventory.service";
import { createTestCategory, createTestSeller, createTestProduct } from "./test-helpers";

/**
 * These tests hit a real PostgreSQL database (DATABASE_URL) — they exercise
 * the exact atomic-UPDATE guard described in inventory.service.ts, not a
 * mock. Requires `npx prisma migrate dev` to have been run first.
 */
describe("reserveAndSell — concurrency", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("prevents overselling when two purchases race for the last unit of stock", async () => {
    const category = await createTestCategory();
    const { seller, store } = await createTestSeller();
    const { product } = await createTestProduct({ sellerId: seller.id, storeId: store.id, categoryId: category.id, stock: 1 });

    const attempt = (ref: string) =>
      prisma.$transaction((tx) => reserveAndSell(tx, [{ productId: product.id, quantity: 1 }], ref));

    const results = await Promise.allSettled([attempt("order-A"), attempt("order-B")]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(InsufficientStockError);

    const inventory = await prisma.inventory.findFirstOrThrow({ where: { productId: product.id } });
    expect(inventory.stock).toBe(0);
    expect(inventory.reserved).toBe(0);
    expect(inventory.sold).toBe(1);
  });

  it("rejects a purchase that exceeds available stock", async () => {
    const category = await createTestCategory();
    const { seller, store } = await createTestSeller();
    const { product } = await createTestProduct({ sellerId: seller.id, storeId: store.id, categoryId: category.id, stock: 3 });

    await expect(
      prisma.$transaction((tx) => reserveAndSell(tx, [{ productId: product.id, quantity: 5 }], "order-too-big"))
    ).rejects.toBeInstanceOf(InsufficientStockError);

    const inventory = await prisma.inventory.findFirstOrThrow({ where: { productId: product.id } });
    expect(inventory.stock).toBe(3);
  });

  it("allows sequential purchases to draw down stock correctly", async () => {
    const category = await createTestCategory();
    const { seller, store } = await createTestSeller();
    const { product } = await createTestProduct({ sellerId: seller.id, storeId: store.id, categoryId: category.id, stock: 5 });

    await prisma.$transaction((tx) => reserveAndSell(tx, [{ productId: product.id, quantity: 2 }], "order-1"));
    await prisma.$transaction((tx) => reserveAndSell(tx, [{ productId: product.id, quantity: 3 }], "order-2"));

    const inventory = await prisma.inventory.findFirstOrThrow({ where: { productId: product.id } });
    expect(inventory.stock).toBe(0);
    expect(inventory.sold).toBe(5);

    await expect(
      prisma.$transaction((tx) => reserveAndSell(tx, [{ productId: product.id, quantity: 1 }], "order-3"))
    ).rejects.toBeInstanceOf(InsufficientStockError);
  });
});
