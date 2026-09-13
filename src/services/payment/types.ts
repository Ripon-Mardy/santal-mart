import type { PaymentMethod, PaymentStatus } from "@/generated/prisma/client";

export type CreatePaymentInput = {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
};

export type CreatePaymentResult = {
  providerRef: string;
  status: PaymentStatus;
};

export type RefundResult = {
  refundRef: string;
  status: PaymentStatus;
};

/**
 * Every payment provider — mock, cash-on-delivery, or a future real
 * gateway (Stripe, SSLCommerz, bKash, Nagad) — implements this contract.
 * Nothing outside src/services/payment ever imports a concrete provider
 * directly; callers always go through getPaymentService().
 */
export interface PaymentProvider {
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyPayment(providerRef: string): Promise<{ status: PaymentStatus }>;
  refundPayment(providerRef: string, amount: number): Promise<RefundResult>;
  getPaymentStatus(providerRef: string): Promise<PaymentStatus>;
}

export function isOnlineMethod(method: PaymentMethod): boolean {
  return method !== "COD";
}
