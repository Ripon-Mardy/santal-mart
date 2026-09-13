import { customAlphabet } from "nanoid";

const numeric = customAlphabet("0123456789", 6);

/** e.g. BX482913 — used as the customer-facing order number. */
export function generateOrderNumber(): string {
  return `BX${numeric()}`;
}

/** e.g. BX482913-1 — one per seller within a multi-vendor order. */
export function generateSubOrderNumber(orderNumber: string, index: number): string {
  return `${orderNumber}-${index + 1}`;
}
