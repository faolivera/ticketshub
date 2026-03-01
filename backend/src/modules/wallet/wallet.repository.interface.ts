import type { Ctx } from '../../common/types/context';
import type { Wallet, WalletTransaction } from './wallet.domain';

/**
 * Wallet repository interface
 */
export interface IWalletRepository {
  // ==================== Wallets ====================

  /**
   * Get wallet by user ID
   */
  getByUserId(ctx: Ctx, userId: string): Promise<Wallet | undefined>;

  /**
   * Create or update wallet
   */
  upsertWallet(ctx: Ctx, wallet: Wallet): Promise<Wallet>;

  /**
   * Update wallet balances
   */
  updateBalances(
    ctx: Ctx,
    userId: string,
    balance: number,
    pendingBalance: number,
  ): Promise<Wallet | undefined>;

  // ==================== Transactions ====================

  /**
   * Create wallet transaction
   */
  createTransaction(
    ctx: Ctx,
    transaction: WalletTransaction,
  ): Promise<WalletTransaction>;

  /**
   * Get transactions by user
   */
  getTransactionsByUserId(
    ctx: Ctx,
    userId: string,
  ): Promise<WalletTransaction[]>;

  /**
   * Get transaction by ID
   */
  getTransactionById(
    ctx: Ctx,
    id: string,
  ): Promise<WalletTransaction | undefined>;
}

/**
 * Injection token for IWalletRepository
 */
export const WALLET_REPOSITORY = Symbol('IWalletRepository');
