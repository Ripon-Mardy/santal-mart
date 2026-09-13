import { randomUUID } from "node:crypto";

import type { CreatePaymentInput, CreatePaymentResult, PaymentProvider, RefundResult } from "./types";

/**
 * Cash on Delivery: no money moves until the courier collects it, so the
 * payment stays PENDING until an admin/seller marks the order delivered
 * (handled by order.service.ts, which flips Payment.status to PAID).
 */
export class CashOnDeliveryProvider implements PaymentProvider {
  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    return { providerRef: `COD-${input.orderNumber}-${randomUUID().slice(0, 8)}`, status: "PENDING" };
  }

  async verifyPayment() {
    return { status: "PENDING" as const };
  }

  async refundPayment(providerRef: string): Promise<RefundResult> {
    // Nothing was captured through a gateway — a COD "refund" just records
    // that cash was returned to the customer out of band.
    return { refundRef: `COD-REFUND-${providerRef}`, status: "REFUNDED" };
  }

  async getPaymentStatus() {
    return "PENDING" as const;
  }
}
