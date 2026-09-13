import { randomUUID } from "node:crypto";

import type { CreatePaymentInput, CreatePaymentResult, PaymentProvider, RefundResult } from "./types";

/**
 * Simulates an online gateway (card/wallet) for development and demos.
 * Approves every payment immediately — structured so a real Stripe /
 * SSLCommerz / bKash / Nagad provider can be dropped in later behind the
 * same PaymentProvider interface without touching checkout code.
 */
export class MockPaymentProvider implements PaymentProvider {
  private readonly ledger = new Map<string, { status: "PAID" | "REFUNDED" | "PARTIALLY_REFUNDED"; amount: number }>();

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const providerRef = `MOCK-${randomUUID()}`;
    this.ledger.set(providerRef, { status: "PAID", amount: input.amount });
    return { providerRef, status: "PAID" };
  }

  async verifyPayment(providerRef: string): Promise<{ status: "PAID" | "REFUNDED" | "PARTIALLY_REFUNDED" | "FAILED" }> {
    const entry = this.ledger.get(providerRef);
    return { status: entry?.status ?? "FAILED" };
  }

  async refundPayment(providerRef: string, amount: number): Promise<RefundResult> {
    const entry = this.ledger.get(providerRef);
    const original = entry?.amount ?? amount;
    const status = amount >= original ? "REFUNDED" : "PARTIALLY_REFUNDED";
    if (entry) entry.status = status;
    return { refundRef: `MOCK-REFUND-${randomUUID()}`, status };
  }

  async getPaymentStatus(providerRef: string) {
    return this.ledger.get(providerRef)?.status ?? "FAILED";
  }
}
