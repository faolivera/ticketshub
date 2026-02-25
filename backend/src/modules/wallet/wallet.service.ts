import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { WalletRepository } from './wallet.repository';
import type { Ctx } from '../../common/types/context';
import type { Wallet, WalletTransaction, Money } from './wallet.domain';
import { WalletTransactionType } from './wallet.domain';
import type { CurrencyCode } from '../shared/money.domain';

@Injectable()
export class WalletService {
  constructor(
    @Inject(WalletRepository)
    private readonly walletRepository: WalletRepository,
  ) {}

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `wtx_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }

  /**
   * Get or create wallet for user
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
        updatedAt: new Date(),
      };
      await this.walletRepository.upsertWallet(ctx, wallet);
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
   */
  async holdFunds(
    ctx: Ctx,
    sellerId: string,
    amount: Money,
    reference: string,
    description: string,
  ): Promise<WalletTransaction> {
    const wallet = await this.getOrCreateWallet(ctx, sellerId, amount.currency);

    // Add to pending balance
    const newPending = wallet.pendingBalance.amount + amount.amount;
    await this.walletRepository.updateBalances(
      ctx,
      sellerId,
      wallet.balance.amount,
      newPending,
    );

    // Create transaction record
    const transaction: WalletTransaction = {
      id: this.generateId(),
      walletUserId: sellerId,
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
   */
  async releaseFunds(
    ctx: Ctx,
    sellerId: string,
    amount: Money,
    reference: string,
    description: string,
  ): Promise<WalletTransaction> {
    const wallet = await this.getOrCreateWallet(ctx, sellerId, amount.currency);

    if (wallet.pendingBalance.amount < amount.amount) {
      throw new BadRequestException('Insufficient pending balance');
    }

    // Move from pending to available
    const newPending = wallet.pendingBalance.amount - amount.amount;
    const newBalance = wallet.balance.amount + amount.amount;
    await this.walletRepository.updateBalances(
      ctx,
      sellerId,
      newBalance,
      newPending,
    );

    // Create transaction record
    const transaction: WalletTransaction = {
      id: this.generateId(),
      walletUserId: sellerId,
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
   */
  async refundHeldFunds(
    ctx: Ctx,
    sellerId: string,
    amount: Money,
    reference: string,
    description: string,
  ): Promise<WalletTransaction> {
    const wallet = await this.getOrCreateWallet(ctx, sellerId, amount.currency);

    // Remove from pending balance (refund goes back to buyer via payment provider)
    const newPending = Math.max(
      0,
      wallet.pendingBalance.amount - amount.amount,
    );
    await this.walletRepository.updateBalances(
      ctx,
      sellerId,
      wallet.balance.amount,
      newPending,
    );

    // Create transaction record
    const transaction: WalletTransaction = {
      id: this.generateId(),
      walletUserId: sellerId,
      type: WalletTransactionType.Debit,
      amount,
      reference,
      description: `Refund: ${description}`,
      createdAt: new Date(),
    };

    return await this.walletRepository.createTransaction(ctx, transaction);
  }

  /**
   * Credit funds to wallet (e.g., manual adjustment, bonus)
   */
  async creditFunds(
    ctx: Ctx,
    userId: string,
    amount: Money,
    reference: string,
    description: string,
  ): Promise<WalletTransaction> {
    const wallet = await this.getOrCreateWallet(ctx, userId, amount.currency);

    const newBalance = wallet.balance.amount + amount.amount;
    await this.walletRepository.updateBalances(
      ctx,
      userId,
      newBalance,
      wallet.pendingBalance.amount,
    );

    const transaction: WalletTransaction = {
      id: this.generateId(),
      walletUserId: userId,
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
   */
  async debitFunds(
    ctx: Ctx,
    userId: string,
    amount: Money,
    reference: string,
    description: string,
  ): Promise<WalletTransaction> {
    const wallet = await this.getOrCreateWallet(ctx, userId, amount.currency);

    if (wallet.balance.amount < amount.amount) {
      throw new BadRequestException('Insufficient balance');
    }

    const newBalance = wallet.balance.amount - amount.amount;
    await this.walletRepository.updateBalances(
      ctx,
      userId,
      newBalance,
      wallet.pendingBalance.amount,
    );

    const transaction: WalletTransaction = {
      id: this.generateId(),
      walletUserId: userId,
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
}
