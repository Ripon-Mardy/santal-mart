import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type TxClient = Prisma.TransactionClient;

async function ensureWallet(tx: TxClient, sellerId: string) {
  return tx.wallet.upsert({
    where: { sellerId },
    update: {},
    create: { sellerId },
  });
}

async function logWalletTxn(
  tx: TxClient,
  params: {
    walletId: string;
    type: "CREDIT" | "DEBIT";
    amount: number;
    balanceAfter: number | Prisma.Decimal;
    reason: string;
    sellerOrderId?: string;
  }
) {
  await tx.walletTransaction.create({ data: params });
}

/**
 * Order placed: the seller's earning for that item goes into `pendingBalance`
 * — it isn't withdrawable until the order is actually delivered (see
 * `releasePendingEarnings`). `totalEarned` reflects gross lifetime earnings
 * regardless of bucket.
 */
export async function creditPendingEarnings(
  tx: TxClient,
  params: { sellerId: string; amount: number; sellerOrderId: string }
) {
  const wallet = await ensureWallet(tx, params.sellerId);
  const updated = await tx.wallet.update({
    where: { id: wallet.id },
    data: { pendingBalance: { increment: params.amount }, totalEarned: { increment: params.amount } },
  });
  await logWalletTxn(tx, {
    walletId: wallet.id,
    type: "CREDIT",
    amount: params.amount,
    balanceAfter: updated.pendingBalance,
    reason: "ORDER_EARNING_PENDING",
    sellerOrderId: params.sellerOrderId,
  });
}

/** Order delivered: moves that suborder's earning from pendingBalance into the withdrawable balance. */
export async function releasePendingEarnings(
  tx: TxClient,
  params: { sellerId: string; amount: number; sellerOrderId: string }
) {
  const wallet = await ensureWallet(tx, params.sellerId);
  const updated = await tx.wallet.update({
    where: { id: wallet.id },
    data: { pendingBalance: { decrement: params.amount }, balance: { increment: params.amount } },
  });
  await logWalletTxn(tx, {
    walletId: wallet.id,
    type: "CREDIT",
    amount: params.amount,
    balanceAfter: updated.balance,
    reason: "EARNINGS_RELEASED",
    sellerOrderId: params.sellerOrderId,
  });
}

/** Order cancelled before delivery: reverses the pending earning that was never actually made. */
export async function reversePendingEarnings(
  tx: TxClient,
  params: { sellerId: string; amount: number; sellerOrderId: string }
) {
  const wallet = await ensureWallet(tx, params.sellerId);
  const updated = await tx.wallet.update({
    where: { id: wallet.id },
    data: { pendingBalance: { decrement: params.amount }, totalEarned: { decrement: params.amount } },
  });
  await logWalletTxn(tx, {
    walletId: wallet.id,
    type: "DEBIT",
    amount: params.amount,
    balanceAfter: updated.pendingBalance,
    reason: "ORDER_CANCELLED",
    sellerOrderId: params.sellerOrderId,
  });
}

/** Approved return/refund after delivery: deducts from the (already withdrawable) balance. */
export async function deductRefundFromWallet(
  tx: TxClient,
  params: { sellerId: string; amount: number; sellerOrderId: string }
) {
  const wallet = await ensureWallet(tx, params.sellerId);
  const updated = await tx.wallet.update({
    where: { id: wallet.id },
    data: { balance: { decrement: params.amount }, totalRefunded: { increment: params.amount } },
  });
  await logWalletTxn(tx, {
    walletId: wallet.id,
    type: "DEBIT",
    amount: params.amount,
    balanceAfter: updated.balance,
    reason: "REFUND_DEDUCTION",
    sellerOrderId: params.sellerOrderId,
  });
}

export class InsufficientBalanceError extends Error {}

// Note on wallet buckets: `pendingBalance` holds earnings from orders that
// haven't been delivered yet (moved to `balance` on delivery — see
// order-status.service.ts). A *payout request* is tracked purely through
// the Payout row's own status (PENDING/PROCESSING/PAID/CANCELLED); it debits
// `balance` immediately on request so the same funds can't be requested
// twice, and there's no separate "awaiting payout" wallet bucket.

/** Seller requests a payout of their available (already-delivered) balance. */
export async function requestPayout(sellerId: string, amount: number) {
  return prisma.$transaction(async (tx) => {
    const wallet = await ensureWallet(tx, sellerId);
    if (Number(wallet.balance) < amount) {
      throw new InsufficientBalanceError("Requested amount exceeds your available balance");
    }

    await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { decrement: amount } } });

    return tx.payout.create({ data: { sellerId, amount, status: "PENDING" } });
  });
}

export async function approvePayout(payoutId: string) {
  return prisma.payout.update({
    where: { id: payoutId },
    data: { status: "PROCESSING", processedAt: new Date() },
  });
}

/** Rejecting/cancelling a payout returns the requested amount to the seller's available balance. */
export async function rejectPayout(payoutId: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const payout = await tx.payout.findUniqueOrThrow({ where: { id: payoutId } });
    const wallet = await ensureWallet(tx, payout.sellerId);

    await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: payout.amount } } });

    return tx.payout.update({
      where: { id: payoutId },
      data: { status: "CANCELLED", rejectionReason: reason, processedAt: new Date() },
    });
  });
}

export async function markPayoutPaid(payoutId: string, adminNote?: string) {
  return prisma.$transaction(async (tx) => {
    const payout = await tx.payout.findUniqueOrThrow({ where: { id: payoutId } });
    const wallet = await ensureWallet(tx, payout.sellerId);
    const updated = await tx.wallet.update({
      where: { id: wallet.id },
      data: { totalPaidOut: { increment: payout.amount } },
    });
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "DEBIT",
        amount: payout.amount,
        balanceAfter: updated.balance,
        reason: "PAYOUT",
        payoutId,
      },
    });

    return tx.payout.update({
      where: { id: payoutId },
      data: { status: "PAID", paidAt: new Date(), adminNote },
    });
  });
}
