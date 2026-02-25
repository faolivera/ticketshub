import { Injectable, OnModuleInit } from '@nestjs/common';
import { KeyValueFileStorage } from '../../common/storage/key-value-file-storage';
import type { Ctx } from '../../common/types/context';
import type { Wallet, WalletTransaction } from './wallet.domain';

@Injectable()
export class WalletRepository implements OnModuleInit {
  private readonly walletStorage: KeyValueFileStorage<Wallet>;
  private readonly transactionStorage: KeyValueFileStorage<WalletTransaction>;

  constructor() {
    this.walletStorage = new KeyValueFileStorage<Wallet>('wallets');
    this.transactionStorage = new KeyValueFileStorage<WalletTransaction>(
      'wallet-transactions',
    );
  }

  /**
   * Load data from file storage when module initializes
   */
  async onModuleInit(): Promise<void> {
    await this.walletStorage.onModuleInit();
    await this.transactionStorage.onModuleInit();
  }

  // ==================== Wallets ====================

  /**
   * Get wallet by user ID
   */
  async getByUserId(ctx: Ctx, userId: string): Promise<Wallet | undefined> {
    return await this.walletStorage.get(ctx, userId);
  }

  /**
   * Create or update wallet
   */
  async upsertWallet(ctx: Ctx, wallet: Wallet): Promise<Wallet> {
    await this.walletStorage.set(ctx, wallet.userId, wallet);
    return wallet;
  }

  /**
   * Update wallet balances
   */
  async updateBalances(
    ctx: Ctx,
    userId: string,
    balance: number,
    pendingBalance: number,
  ): Promise<Wallet | undefined> {
    const existing = await this.walletStorage.get(ctx, userId);
    if (!existing) return undefined;

    const updated: Wallet = {
      ...existing,
      balance: { ...existing.balance, amount: balance },
      pendingBalance: { ...existing.pendingBalance, amount: pendingBalance },
      updatedAt: new Date(),
    };
    await this.walletStorage.set(ctx, userId, updated);
    return updated;
  }

  // ==================== Transactions ====================

  /**
   * Create wallet transaction
   */
  async createTransaction(
    ctx: Ctx,
    transaction: WalletTransaction,
  ): Promise<WalletTransaction> {
    await this.transactionStorage.set(ctx, transaction.id, transaction);
    return transaction;
  }

  /**
   * Get transactions by user
   */
  async getTransactionsByUserId(
    ctx: Ctx,
    userId: string,
  ): Promise<WalletTransaction[]> {
    const all = await this.transactionStorage.getAll(ctx);
    return all
      .filter((t) => t.walletUserId === userId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(
    ctx: Ctx,
    id: string,
  ): Promise<WalletTransaction | undefined> {
    return await this.transactionStorage.get(ctx, id);
  }
}
