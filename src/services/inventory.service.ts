import "server-only";

import { Prisma, type InventoryMovementType } from "@/generated/prisma/client";

type TxClient = Prisma.TransactionClient;

export type StockItem = {
  productId: string;
  variantId?: string | null;
  quantity: number;
};

export class InsufficientStockError extends Error {
  constructor(
    public readonly productId: string,
    public readonly variantId: string | null,
  ) {
    super(
      `Insufficient stock for product ${productId}${variantId ? ` (variant ${variantId})` : ""}`,
    );
    this.name = "InsufficientStockError";
  }
}

async function logMovement(
  tx: TxClient,
  inventoryId: string,
  type: InventoryMovementType,
  quantity: number,
  reference?: string,
  note?: string,
) {
  await tx.inventoryMovement.create({
    data: { inventoryId, type, quantity, reference, note },
  });
}

export async function reserveAndSell(
  tx: TxClient,
  items: StockItem[],
  reference: string,
) {
  for (const item of items) {
    const variantId = item.variantId ?? null;

    const reserved = await tx.$queryRaw<{ id: string }[]>`
      UPDATE "Inventory"
      SET reserved = reserved + ${item.quantity}, "updatedAt" = now()
      WHERE "productId" = ${item.productId}
        AND "variantId" IS NOT DISTINCT FROM ${variantId}
        AND (stock - reserved) >= ${item.quantity}
      RETURNING id
    `;

    if (reserved.length === 0) {
      throw new InsufficientStockError(item.productId, variantId);
    }

    const inventoryId = reserved[0].id;
    await logMovement(tx, inventoryId, "RESERVATION", item.quantity, reference);

    await tx.$executeRaw`
      UPDATE "Inventory"
      SET stock = stock - ${item.quantity}, reserved = reserved - ${item.quantity}, sold = sold + ${item.quantity}, "updatedAt" = now()
      WHERE id = ${inventoryId}
    `;
    await logMovement(tx, inventoryId, "SALE", item.quantity, reference);

    await tx.product.update({
      where: { id: item.productId },
      data: { soldCount: { increment: item.quantity } },
    });
  }
}

/** Restocks items — used for order cancellations, approved returns, and manual seller/admin adjustments. */
export async function restock(
  tx: TxClient,
  items: StockItem[],
  type: Extract<
    InventoryMovementType,
    "CANCELLATION" | "RETURN" | "PURCHASE" | "ADJUSTMENT"
  >,
  reference?: string,
  note?: string,
) {
  for (const item of items) {
    const variantId = item.variantId ?? null;

    const rows = await tx.$queryRaw<{ id: string }[]>`
      UPDATE "Inventory"
      SET stock = stock + ${item.quantity}, "updatedAt" = now()
      WHERE "productId" = ${item.productId} AND "variantId" IS NOT DISTINCT FROM ${variantId}
      RETURNING id
    `;

    if (rows.length === 0) continue;

    await logMovement(tx, rows[0].id, type, item.quantity, reference, note);

    if (type === "CANCELLATION" || type === "RETURN") {
      await tx.product.update({
        where: { id: item.productId },
        data: { soldCount: { decrement: item.quantity } },
      });
    }
  }
}

export async function getAvailableStock(
  tx: TxClient,
  productId: string,
  variantId?: string | null,
) {
  const inventory = await tx.inventory.findFirst({
    where: { productId, variantId: variantId ?? null },
  });
  if (!inventory) return 0;
  return inventory.stock - inventory.reserved;
}
