import { Injectable } from '@nestjs/common';
import {
  Wallet as PrismaWallet,
  WalletTransaction as PrismaWalletTransaction,
  WalletTransactionType as PrismaWalletTransactionType,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Ctx } from '../../common/types/context';
import type { Wallet, WalletTransaction, Money } from './wallet.domain';
import { WalletTransactionType } from './wallet.domain';
import type { IWalletRepository } from './wallet.repository.interface';

@Injectable()
export class WalletRepository implements IWalletRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== Wallets ====================

  async getByUserId(_ctx: Ctx, userId: string): Promise<Wallet | undefined> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });
    return wallet ? this.mapToWallet(wallet) : undefined;
  }

  async upsertWallet(_ctx: Ctx, wallet: Wallet): Promise<Wallet> {
    const upserted = await this.prisma.wallet.upsert({
      where: { userId: wallet.userId },
      create: {
        userId: wallet.userId,
        balance: wallet.balance as object,
        pendingBalance: wallet.pendingBalance as object,
        updatedAt: wallet.updatedAt,
      },
      update: {
        balance: wallet.balance as object,
        pendingBalance: wallet.pendingBalance as object,
        updatedAt: wallet.updatedAt,
      },
    });
    return this.mapToWallet(upserted);
  }

  async updateBalances(
    _ctx: Ctx,
    userId: string,
    balance: number,
    pendingBalance: number,
  ): Promise<Wallet | undefined> {
    const existing = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!existing) return undefined;

    const currentBalance = existing.balance as unknown as Money;
    const currentPending = existing.pendingBalance as unknown as Money;

    const updated = await this.prisma.wallet.update({
      where: { userId },
      data: {
        balance: { ...currentBalance, amount: balance } as object,
        pendingBalance: { ...currentPending, amount: pendingBalance } as object,
        updatedAt: new Date(),
      },
    });

    return this.mapToWallet(updated);
  }

  // ==================== Transactions ====================

  async createTransaction(
    _ctx: Ctx,
    transaction: WalletTransaction,
  ): Promise<WalletTransaction> {
    const created = await this.prisma.walletTransaction.create({
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
    _ctx: Ctx,
    userId: string,
  ): Promise<WalletTransaction[]> {
    const transactions = await this.prisma.walletTransaction.findMany({
      where: { walletUserId: userId },
      orderBy: { createdAt: 'desc' },
    });
    return transactions.map((t) => this.mapToWalletTransaction(t));
  }

  async getTransactionById(
    _ctx: Ctx,
    id: string,
  ): Promise<WalletTransaction | undefined> {
    const transaction = await this.prisma.walletTransaction.findUnique({
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
