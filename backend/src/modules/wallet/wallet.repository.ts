import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Wallet as PrismaWallet,
  WalletTransaction as PrismaWalletTransaction,
  WalletTransactionType as PrismaWalletTransactionType,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BaseRepository } from '../../common/repositories/base.repository';
import { OptimisticLockException } from '../../common/exceptions/optimistic-lock.exception';
import type { Ctx } from '../../common/types/context';
import type { Wallet, WalletTransaction, Money } from './wallet.domain';
import { WalletTransactionType } from './wallet.domain';
import type { IWalletRepository } from './wallet.repository.interface';

@Injectable()
export class WalletRepository
  extends BaseRepository
  implements IWalletRepository
{
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ==================== Wallets ====================

  async getByUserId(ctx: Ctx, userId: string): Promise<Wallet | undefined> {
    const client = this.getClient(ctx);
    const wallet = await client.wallet.findUnique({
      where: { userId },
    });
    return wallet ? this.mapToWallet(wallet) : undefined;
  }

  /**
   * Get wallet by user ID with pessimistic lock (FOR UPDATE)
   * Blocks other transactions from modifying this row until current transaction commits
   */
  async findByUserIdForUpdate(
    ctx: Ctx,
    userId: string,
  ): Promise<Wallet | undefined> {
    const client = this.getClient(ctx);

    const [wallet] = await client.$queryRaw<PrismaWallet[]>`
      SELECT * FROM wallets
      WHERE user_id = ${userId}
      FOR UPDATE
    `;

    return wallet ? this.mapToWallet(wallet) : undefined;
  }

  async upsertWallet(ctx: Ctx, wallet: Wallet): Promise<Wallet> {
    const client = this.getClient(ctx);
    const upserted = await client.wallet.upsert({
      where: { userId: wallet.userId },
      create: {
        userId: wallet.userId,
        balance: wallet.balance as object,
        pendingBalance: wallet.pendingBalance as object,
        version: wallet.version,
        updatedAt: wallet.updatedAt,
      },
      update: {
        balance: wallet.balance as object,
        pendingBalance: wallet.pendingBalance as object,
        version: wallet.version,
        updatedAt: wallet.updatedAt,
      },
    });
    return this.mapToWallet(upserted);
  }

  async updateBalances(
    ctx: Ctx,
    userId: string,
    balance: number,
    pendingBalance: number,
  ): Promise<Wallet | undefined> {
    const client = this.getClient(ctx);
    const existing = await client.wallet.findUnique({
      where: { userId },
    });

    if (!existing) return undefined;

    const currentBalance = existing.balance as unknown as Money;
    const currentPending = existing.pendingBalance as unknown as Money;

    const updated = await client.wallet.update({
      where: { userId },
      data: {
        balance: { ...currentBalance, amount: balance } as object,
        pendingBalance: { ...currentPending, amount: pendingBalance } as object,
        version: { increment: 1 },
        updatedAt: new Date(),
      },
    });

    return this.mapToWallet(updated);
  }

  /**
   * Atomically update balances with version check (optimistic locking pattern)
   * Uses raw SQL with jsonb_set for atomic JSON field updates
   * Fails if the wallet has been modified since it was read (version mismatch)
   * @throws OptimisticLockException if version mismatch
   */
  async updateBalancesWithVersion(
    ctx: Ctx,
    userId: string,
    balanceChange: number,
    pendingChange: number,
    expectedVersion: number,
  ): Promise<Wallet> {
    const client = this.getClient(ctx);
    const result = await client.$executeRaw`
      UPDATE wallets
      SET 
        balance = jsonb_set(
          balance::jsonb, 
          '{amount}', 
          to_jsonb((balance->>'amount')::numeric + ${balanceChange})
        ),
        pending_balance = jsonb_set(
          pending_balance::jsonb, 
          '{amount}', 
          to_jsonb((pending_balance->>'amount')::numeric + ${pendingChange})
        ),
        version = version + 1,
        updated_at = NOW()
      WHERE user_id = ${userId} AND version = ${expectedVersion}
    `;

    if (result === 0) {
      throw new OptimisticLockException('Wallet', userId);
    }

    const updated = await this.getByUserId(ctx, userId);
    if (!updated) {
      throw new NotFoundException(`Wallet not found for user ${userId}`);
    }
    return updated;
  }

  // ==================== Transactions ====================

  async createTransaction(
    ctx: Ctx,
    transaction: WalletTransaction,
  ): Promise<WalletTransaction> {
    const client = this.getClient(ctx);
    const created = await client.walletTransaction.create({
      data: {
        id: transaction.id,
        walletUserId: transaction.walletUserId,
        type: this.mapTransactionTypeToDb(transaction.type),
        amount: transaction.amount as object,
        description: transaction.description,
        referenceType: 'transaction',
        referenceId: transaction.reference,
        createdAt: transaction.createdAt,
      },
    });
    return this.mapToWalletTransaction(created);
  }

  async getTransactionsByUserId(
    ctx: Ctx,
    userId: string,
  ): Promise<WalletTransaction[]> {
    const client = this.getClient(ctx);
    const transactions = await client.walletTransaction.findMany({
      where: { walletUserId: userId },
      orderBy: { createdAt: 'desc' },
    });
    return transactions.map((t) => this.mapToWalletTransaction(t));
  }

  async getTransactionById(
    ctx: Ctx,
    id: string,
  ): Promise<WalletTransaction | undefined> {
    const client = this.getClient(ctx);
    const transaction = await client.walletTransaction.findUnique({
      where: { id },
    });
    return transaction ? this.mapToWalletTransaction(transaction) : undefined;
  }

  // ==================== Mappers ====================

  private mapToWallet(prisma: PrismaWallet): Wallet {
    return {
      userId: prisma.userId,
      balance: prisma.balance as unknown as Money,
      pendingBalance: prisma.pendingBalance as unknown as Money,
      version: prisma.version,
      updatedAt: prisma.updatedAt,
    };
  }

  private mapToWalletTransaction(
    prisma: PrismaWalletTransaction,
  ): WalletTransaction {
    return {
      id: prisma.id,
      walletUserId: prisma.walletUserId,
      type: this.mapTransactionTypeFromDb(prisma.type),
      amount: prisma.amount as unknown as Money,
      reference: prisma.referenceId ?? '',
      description: prisma.description,
      createdAt: prisma.createdAt,
    };
  }

  // ==================== Enum Mappers ====================

  private mapTransactionTypeToDb(
    type: WalletTransactionType,
  ): PrismaWalletTransactionType {
    switch (type) {
      case WalletTransactionType.Credit:
        return 'credit';
      case WalletTransactionType.Debit:
        return 'debit';
      case WalletTransactionType.Hold:
        return 'pending_credit';
      case WalletTransactionType.Release:
        return 'pending_release';
    }
  }

  private mapTransactionTypeFromDb(
    type: PrismaWalletTransactionType,
  ): WalletTransactionType {
    switch (type) {
      case 'credit':
        return WalletTransactionType.Credit;
      case 'debit':
        return WalletTransactionType.Debit;
      case 'pending_credit':
        return WalletTransactionType.Hold;
      case 'pending_release':
        return WalletTransactionType.Release;
      case 'payout':
        return WalletTransactionType.Debit;
    }
  }
}
