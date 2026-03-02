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
   * Get wallet by user ID with pessimistic lock (FOR UPDATE)
   * Use this when you need to read and then modify the wallet atomically
   */
  findByUserIdForUpdate(ctx: Ctx, userId: string): Promise<Wallet | undefined>;

  /**
   * Create or update wallet
   */
  upsertWallet(ctx: Ctx, wallet: Wallet): Promise<Wallet>;

  /**
   * Update wallet balances
   * @deprecated Use updateBalancesWithVersion for safe concurrent updates
   */
  updateBalances(
    ctx: Ctx,
    userId: string,
    balance: number,
    pendingBalance: number,
  ): Promise<Wallet | undefined>;

  /**
   * Atomically update balances with version check (optimistic locking pattern)
   * Should be used within a transaction after acquiring pessimistic lock
   * @throws OptimisticLockException if version mismatch
   */
  updateBalancesWithVersion(
    ctx: Ctx,
    userId: string,
    balanceChange: number,
    pendingChange: number,
    expectedVersion: number,
  ): Promise<Wallet>;

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
