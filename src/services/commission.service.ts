import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const DEFAULT_GLOBAL_COMMISSION_RATE = 10;
const GLOBAL_COMMISSION_SETTING_KEY = "commission.globalRate";

type Db = Prisma.TransactionClient | typeof prisma;

export async function getGlobalCommissionRate(db: Db = prisma): Promise<number> {
  const setting = await db.setting.findUnique({ where: { key: GLOBAL_COMMISSION_SETTING_KEY } });
  return setting ? Number(setting.value) : DEFAULT_GLOBAL_COMMISSION_RATE;
}

export async function setGlobalCommissionRate(rate: number) {
  await prisma.setting.upsert({
    where: { key: GLOBAL_COMMISSION_SETTING_KEY },
    update: { value: String(rate), group: "commission" },
    create: { key: GLOBAL_COMMISSION_SETTING_KEY, value: String(rate), group: "commission" },
  });
}

/**
 * Resolves the commission rate that applies to a sale, in priority order:
 * seller-specific override > category override > platform global default
 * (spec §21). The result is snapshotted onto OrderItem at purchase time so
 * a later rate change never rewrites historical order economics.
 */
export async function getEffectiveCommissionRate(
  params: { sellerId: string; categoryId: string },
  db: Db = prisma
): Promise<number> {
  const sellerRule = await db.commission.findUnique({ where: { sellerId: params.sellerId } });
  if (sellerRule) return Number(sellerRule.rate);

  const categoryRule = await db.commission.findUnique({ where: { categoryId: params.categoryId } });
  if (categoryRule) return Number(categoryRule.rate);

  return getGlobalCommissionRate(db);
}

export function calculateCommission(lineTotal: number, ratePercent: number) {
  const commissionAmount = Math.round(lineTotal * (ratePercent / 100) * 100) / 100;
  const sellerEarning = Math.round((lineTotal - commissionAmount) * 100) / 100;
  return { commissionAmount, sellerEarning };
}
