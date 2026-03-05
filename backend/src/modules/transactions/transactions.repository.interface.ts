import type { Ctx } from '../../common/types/context';
import type { Transaction } from './transactions.domain';
import type { TransactionStatus } from './transactions.domain';

/**
 * Transactions repository interface
 */
export interface ITransactionsRepository {
  /**
   * Create a new transaction
   */
  create(ctx: Ctx, transaction: Transaction): Promise<Transaction>;

  /**
   * Find transaction by ID
   */
  findById(ctx: Ctx, id: string): Promise<Transaction | undefined>;

  /**
   * Get all transactions
   */
  getAll(ctx: Ctx): Promise<Transaction[]>;

  /**
   * Get transactions by buyer
   */
  getByBuyerId(ctx: Ctx, buyerId: string): Promise<Transaction[]>;

  /**
   * Get transactions by seller
   */
  getBySellerId(ctx: Ctx, sellerId: string): Promise<Transaction[]>;

  /**
   * Get transactions by listing
   */
  getByListingId(ctx: Ctx, listingId: string): Promise<Transaction[]>;

  /**
   * Get transactions by listing IDs
   */
  getByListingIds(ctx: Ctx, listingIds: string[]): Promise<Transaction[]>;

  /**
   * Get transactions pending transition to TransferringFund (TicketTransferred or DepositHold, depositReleaseAt passed, no dispute)
   */
  getPendingDepositRelease(ctx: Ctx): Promise<Transaction[]>;

  /**
   * Update transaction
   */
  update(
    ctx: Ctx,
    id: string,
    updates: Partial<Transaction>,
  ): Promise<Transaction | undefined>;

  /**
   * Get paginated transactions with optional filters.
   * Filters are OR'd: match transactionIds OR buyerId in buyerIds OR sellerId in sellerIds.
   */
  getPaginated(
    ctx: Ctx,
    page: number,
    limit: number,
    filters?: {
      transactionIds?: string[];
      buyerIds?: string[];
      sellerIds?: string[];
    },
  ): Promise<{ transactions: Transaction[]; total: number }>;

  /**
   * Get transactions by IDs (batch)
   */
  findByIds(ctx: Ctx, ids: string[]): Promise<Transaction[]>;

  /**
   * Count transactions by status values
   */
  countByStatuses(ctx: Ctx, statuses: TransactionStatus[]): Promise<number>;

  /**
   * Get transaction IDs by status values
   */
  getIdsByStatuses(ctx: Ctx, statuses: TransactionStatus[]): Promise<string[]>;

  /**
   * Find transactions with expired payment window
   */
  findExpiredPendingPayments(ctx: Ctx): Promise<Transaction[]>;

  /**
   * Find transactions with expired admin review window
   */
  findExpiredAdminReviews(ctx: Ctx): Promise<Transaction[]>;

  /**
   * Find transaction by ID with pessimistic lock (FOR UPDATE).
   * Must be called within a database transaction.
   */
  findByIdForUpdate(ctx: Ctx, id: string): Promise<Transaction | undefined>;

  /**
   * Update transaction with optimistic locking.
   * @throws OptimisticLockException on version mismatch
   */
  updateWithVersion(
    ctx: Ctx,
    id: string,
    updates: Partial<Transaction>,
    expectedVersion: number,
  ): Promise<Transaction>;

  /**
   * Get completed transactions for multiple sellers (batch)
   */
  getCompletedBySellerIds(
    ctx: Ctx,
    sellerIds: string[],
  ): Promise<Transaction[]>;
}

/**
 * Injection token for ITransactionsRepository
 */
export const TRANSACTIONS_REPOSITORY = Symbol('ITransactionsRepository');
