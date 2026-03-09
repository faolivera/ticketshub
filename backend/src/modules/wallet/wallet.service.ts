import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import type { IWalletRepository } from './wallet.repository.interface';
import { WALLET_REPOSITORY } from './wallet.repository.interface';
import { TransactionManager } from '../../common/database';
import { InsufficientFundsException } from '../../common/exceptions/insufficient-funds.exception';
import type { Ctx } from '../../common/types/context';
import type { Wallet, WalletTransaction, Money } from './wallet.domain';
import { WalletTransactionType } from './wallet.domain';
import type { CurrencyCode } from '../shared/money.domain';

@Injectable()
export class WalletService {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: IWalletRepository,
    private readonly txManager: TransactionManager,
  ) {}

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `wtx_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }

  /**
   * Get or create wallet for user (within transaction context)
   */
  async getOrCreateWallet(
    ctx: Ctx,
    userId: string,
    currency: CurrencyCode = 'EUR',
  ): Promise<Wallet> {
    let wallet = await this.walletRepository.getByUserId(ctx, userId);

    if (!wallet) {
      wallet = {
        userId,
        balance: { amount: 0, currency },
        pendingBalance: { amount: 0, currency },
        version: 1,
        updatedAt: new Date(),
      };
      wallet = await this.walletRepository.upsertWallet(ctx, wallet);
    }

    return wallet;
  }

  /**
   * Get wallet balance
   */
  async getBalance(ctx: Ctx, userId: string): Promise<Wallet> {
    return await this.getOrCreateWallet(ctx, userId);
  }

  /**
   * Hold funds in escrow (when buyer pays)
   * Uses pessimistic locking (FOR UPDATE) to prevent concurrent modifications,
   * combined with version check for additional safety
   */
  async holdFunds(
    ctx: Ctx,
    sellerId: string,
    amount: Money,
    reference: string,
    description: string,
  ): Promise<WalletTransaction> {
    return this.txManager.executeInTransaction(ctx, async (txCtx) => {
      const wallet = await this.walletRepository.findByUserIdForUpdate(
        txCtx,
        sellerId,
      );

      if (!wallet) {
        // Create wallet if not exists
        const newWallet: Wallet = {
          userId: sellerId,
          balance: { amount: 0, currency: amount.currency },
          pendingBalance: { amount: 0, currency: amount.currency },
          version: 1,
          updatedAt: new Date(),
        };
        await this.walletRepository.upsertWallet(txCtx, newWallet);

        // Re-fetch with lock to get accurate version
        const createdWallet = await this.walletRepository.findByUserIdForUpdate(
          txCtx,
          sellerId,
        );
        return this.executeHoldFunds(
          txCtx,
          createdWallet!,
          amount,
          reference,
          description,
        );
      }

      return this.executeHoldFunds(
        txCtx,
        wallet,
        amount,
        reference,
        description,
      );
    });
  }

  private async executeHoldFunds(
    ctx: Ctx,
    wallet: Wallet,
    amount: Money,
    reference: string,
    description: string,
  ): Promise<WalletTransaction> {
    // Update with version check (add to pending)
    await this.walletRepository.updateBalancesWithVersion(
      ctx,
      wallet.userId,
      0, // balance change
      amount.amount, // pending change (add to pending)
      wallet.version,
    );

    const transaction: WalletTransaction = {
      id: this.generateId(),
      walletUserId: wallet.userId,
      type: WalletTransactionType.Hold,
      amount,
      reference,
      description,
      createdAt: new Date(),
    };

    return await this.walletRepository.createTransaction(ctx, transaction);
  }

  /**
   * Release funds from escrow to balance (when transaction completes)
   * Uses pessimistic locking (FOR UPDATE) to prevent concurrent modifications,
   * combined with version check for additional safety
   */
  async releaseFunds(
    ctx: Ctx,
    sellerId: string,
    amount: Money,
    reference: string,
    description: string,
  ): Promise<WalletTransaction> {
    return this.txManager.executeInTransaction(ctx, async (txCtx) => {
      const wallet = await this.walletRepository.findByUserIdForUpdate(
        txCtx,
        sellerId,
      );

      if (!wallet) {
        const newWallet = await this.createWalletWithLock(
          txCtx,
          sellerId,
          amount.currency,
        );
        return this.executeReleaseFunds(
          txCtx,
          newWallet,
          amount,
          reference,
          description,
        );
      }

      return this.executeReleaseFunds(
        txCtx,
        wallet,
        amount,
        reference,
        description,
      );
    });
  }

  private async executeReleaseFunds(
    ctx: Ctx,
    wallet: Wallet,
    amount: Money,
    reference: string,
    description: string,
  ): Promise<WalletTransaction> {
    if (wallet.pendingBalance.amount < amount.amount) {
      throw new BadRequestException('Insufficient pending balance');
    }

    // Move from pending to available: balance += amount, pending -= amount
    await this.walletRepository.updateBalancesWithVersion(
      ctx,
      wallet.userId,
      amount.amount, // balance change (add to balance)
      -amount.amount, // pending change (subtract from pending)
      wallet.version,
    );

    const transaction: WalletTransaction = {
      id: this.generateId(),
      walletUserId: wallet.userId,
      type: WalletTransactionType.Release,
      amount,
      reference,
      description,
      createdAt: new Date(),
    };

    return await this.walletRepository.createTransaction(ctx, transaction);
  }

  /**
   * Refund held funds (when transaction is cancelled/disputed)
   * Uses pessimistic locking (FOR UPDATE) to prevent concurrent modifications,
   * combined with version check for additional safety
   */
  async refundHeldFunds(
    ctx: Ctx,
    sellerId: string,
    amount: Money,
    reference: string,
    description: string,
  ): Promise<WalletTransaction> {
    return this.txManager.executeInTransaction(ctx, async (txCtx) => {
      const wallet = await this.walletRepository.findByUserIdForUpdate(
        txCtx,
        sellerId,
      );

      if (!wallet) {
        const newWallet = await this.createWalletWithLock(
          txCtx,
          sellerId,
          amount.currency,
        );
        return this.executeRefundHeldFunds(
          txCtx,
          newWallet,
          amount,
          reference,
          description,
        );
      }

      return this.executeRefundHeldFunds(
        txCtx,
        wallet,
        amount,
        reference,
        description,
      );
    });
  }

  private async executeRefundHeldFunds(
    ctx: Ctx,
    wallet: Wallet,
    amount: Money,
    reference: string,
    description: string,
  ): Promise<WalletTransaction> {
    // Calculate actual amount to refund (cannot go below 0)
    const actualRefund = Math.min(amount.amount, wallet.pendingBalance.amount);

    // Remove from pending balance
    await this.walletRepository.updateBalancesWithVersion(
      ctx,
      wallet.userId,
      0, // balance change
      -actualRefund, // pending change (subtract from pending)
      wallet.version,
    );

    const transaction: WalletTransaction = {
      id: this.generateId(),
      walletUserId: wallet.userId,
      type: WalletTransactionType.Debit,
      amount: { ...amount, amount: actualRefund },
      reference,
      description: `Refund: ${description}`,
      createdAt: new Date(),
    };

    return await this.walletRepository.createTransaction(ctx, transaction);
  }

  /**
   * Credit funds to wallet (e.g., manual adjustment, bonus)
   * Uses pessimistic locking (FOR UPDATE) to prevent concurrent modifications,
   * combined with version check for additional safety
   */
  async creditFunds(
    ctx: Ctx,
    userId: string,
    amount: Money,
    reference: string,
    description: string,
  ): Promise<WalletTransaction> {
    return this.txManager.executeInTransaction(ctx, async (txCtx) => {
      const wallet = await this.walletRepository.findByUserIdForUpdate(
        txCtx,
        userId,
      );

      if (!wallet) {
        const newWallet = await this.createWalletWithLock(
          txCtx,
          userId,
          amount.currency,
        );
        return this.executeCreditFunds(
          txCtx,
          newWallet,
          amount,
          reference,
          description,
        );
      }

      return this.executeCreditFunds(
        txCtx,
        wallet,
        amount,
        reference,
        description,
      );
    });
  }

  private async executeCreditFunds(
    ctx: Ctx,
    wallet: Wallet,
    amount: Money,
    reference: string,
    description: string,
  ): Promise<WalletTransaction> {
    // Add to balance
    await this.walletRepository.updateBalancesWithVersion(
      ctx,
      wallet.userId,
      amount.amount, // balance change (add to balance)
      0, // pending change
      wallet.version,
    );

    const transaction: WalletTransaction = {
      id: this.generateId(),
      walletUserId: wallet.userId,
      type: WalletTransactionType.Credit,
      amount,
      reference,
      description,
      createdAt: new Date(),
    };

    return await this.walletRepository.createTransaction(ctx, transaction);
  }

  /**
   * Debit funds from wallet (e.g., withdrawal)
   * Uses pessimistic locking (FOR UPDATE) to prevent concurrent modifications,
   * combined with version check for additional safety
   * @throws InsufficientFundsException if balance is insufficient
   */
  async debitFunds(
    ctx: Ctx,
    userId: string,
    amount: Money,
    reference: string,
    description: string,
  ): Promise<WalletTransaction> {
    return this.txManager.executeInTransaction(ctx, async (txCtx) => {
      const wallet = await this.walletRepository.findByUserIdForUpdate(
        txCtx,
        userId,
      );

      if (!wallet) {
        const newWallet = await this.createWalletWithLock(
          txCtx,
          userId,
          amount.currency,
        );
        return this.executeDebitFunds(
          txCtx,
          newWallet,
          amount,
          reference,
          description,
        );
      }

      return this.executeDebitFunds(
        txCtx,
        wallet,
        amount,
        reference,
        description,
      );
    });
  }

  private async executeDebitFunds(
    ctx: Ctx,
    wallet: Wallet,
    amount: Money,
    reference: string,
    description: string,
  ): Promise<WalletTransaction> {
    if (wallet.balance.amount < amount.amount) {
      throw new InsufficientFundsException(
        wallet.balance.amount,
        amount.amount,
      );
    }

    // Subtract from balance
    await this.walletRepository.updateBalancesWithVersion(
      ctx,
      wallet.userId,
      -amount.amount, // balance change (subtract from balance)
      0, // pending change
      wallet.version,
    );

    const transaction: WalletTransaction = {
      id: this.generateId(),
      walletUserId: wallet.userId,
      type: WalletTransactionType.Debit,
      amount,
      reference,
      description,
      createdAt: new Date(),
    };

    return await this.walletRepository.createTransaction(ctx, transaction);
  }

  /**
   * Get wallet transaction history
   */
  async getTransactions(
    ctx: Ctx,
    userId: string,
  ): Promise<WalletTransaction[]> {
    return await this.walletRepository.getTransactionsByUserId(ctx, userId);
  }

  /**
   * Helper to create a wallet and return it with lock
   */
  private async createWalletWithLock(
    ctx: Ctx,
    userId: string,
    currency: CurrencyCode,
  ): Promise<Wallet> {
    const newWallet: Wallet = {
      userId,
      balance: { amount: 0, currency },
      pendingBalance: { amount: 0, currency },
      version: 1,
      updatedAt: new Date(),
    };
    await this.walletRepository.upsertWallet(ctx, newWallet);

    // Re-fetch with lock to get accurate version
    const wallet = await this.walletRepository.findByUserIdForUpdate(
      ctx,
      userId,
    );
    return wallet!;
  }
}
