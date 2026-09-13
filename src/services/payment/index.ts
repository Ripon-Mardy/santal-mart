import type { PaymentMethod } from "@/generated/prisma/client";
import type { PaymentProvider } from "./types";
import { MockPaymentProvider } from "./mock-provider";
import { CashOnDeliveryProvider } from "./cod-provider";

export type { PaymentProvider, CreatePaymentInput, CreatePaymentResult, RefundResult } from "./types";
export { isOnlineMethod } from "./types";

const mockProvider = new MockPaymentProvider();
const codProvider = new CashOnDeliveryProvider();

/**
 * Resolves the PaymentProvider for a given method. Real gateways (Stripe,
 * SSLCommerz, bKash, Nagad) would register here for MOCK_CARD/MOCK_WALLET's
 * real-world equivalents — checkout and order code never changes.
 */
export function getPaymentService(method: PaymentMethod): PaymentProvider {
  if (method === "COD") return codProvider;
  return mockProvider;
}
