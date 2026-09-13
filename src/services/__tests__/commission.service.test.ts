import { describe, expect, it } from "vitest";

import { calculateCommission } from "@/services/commission.service";

describe("calculateCommission", () => {
  it("splits a line total into commission and seller earning at the given rate", () => {
    const { commissionAmount, sellerEarning } = calculateCommission(1000, 10);
    expect(commissionAmount).toBe(100);
    expect(sellerEarning).toBe(900);
  });

  it("rounds to 2 decimal places", () => {
    const { commissionAmount, sellerEarning } = calculateCommission(99.99, 7.5);
    expect(commissionAmount).toBeCloseTo(7.5, 2);
    expect(commissionAmount + sellerEarning).toBeCloseTo(99.99, 2);
  });

  it("charges no commission at a 0% rate", () => {
    const { commissionAmount, sellerEarning } = calculateCommission(500, 0);
    expect(commissionAmount).toBe(0);
    expect(sellerEarning).toBe(500);
  });

  it("commission + seller earning always reconstructs the original line total", () => {
    for (const [amount, rate] of [
      [149999, 8],
      [899, 10],
      [24999, 12.5],
    ]) {
      const { commissionAmount, sellerEarning } = calculateCommission(amount, rate);
      expect(Math.round((commissionAmount + sellerEarning) * 100) / 100).toBeCloseTo(amount, 2);
    }
  });
});
