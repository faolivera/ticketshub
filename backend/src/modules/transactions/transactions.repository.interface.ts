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
   * Get transactions by buyer
   */
  getByBuyerId(ctx: Ctx, buyerId: string): Promise<Transaction[]>;

  /**
   * Get transactions by buyer with optional status filter and pagination (DB-level).
   */
  getByBuyerIdPaginated(
    ctx: Ctx,
    buyerId: string,
    opts: { status?: TransactionStatus; limit: number; offset: number },
  ): Promise<{ transactions: Transaction[]; total: number }>;

  /**
   * Get transactions by seller
   */
  getBySellerId(ctx: Ctx, sellerId: string): Promise<Transaction[]>;

  /**
   * Get transactions by seller with optional status filter and pagination (DB-level).
   */
  getBySellerIdPaginated(
    ctx: Ctx,
    sellerId: string,
    opts: { status?: TransactionStatus; limit: number; offset: number },
  ): Promise<{ transactions: Transaction[]; total: number }>;

  /**
   * Get transactions where user is buyer or seller, with optional status filter and pagination (DB-level).
   */
  getByUserIdPaginated(
    ctx: Ctx,
    userId: string,
    opts: { status?: TransactionStatus; limit: number; offset: number },
  ): Promise<{ transactions: Transaction[]; total: number }>;

  /**
   * Get transactions by listing
   */
  getByListingId(ctx: Ctx, listingId: string): Promise<Transaction[]>;

  /**
   * Get transactions by listing IDs
   */
  getByListingIds(ctx: Ctx, listingIds: string[]): Promise<Transaction[]>;

  /**
   * Get transactions pending transition to TransferringFund (TicketTransferred or DepositHold, depositReleaseAt passed, no dispute).
   * Optionally limited to avoid processing too many in one scheduler run.
   */
  getPendingDepositRelease(
    ctx: Ctx,
    limit?: number,
  ): Promise<Transaction[]>;

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
   * Find transactions with expired payment window. Optionally limited for scheduler batch size.
   */
  findExpiredPendingPayments(
    ctx: Ctx,
    limit?: number,
  ): Promise<Transaction[]>;

  /**
   * Find transactions with expired admin review window. Optionally limited for scheduler batch size.
   */
  findExpiredAdminReviews(ctx: Ctx, limit?: number): Promise<Transaction[]>;

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

  /**
   * Get transactions by status and payment method IDs (for admin pending manual payments).
   */
  getByStatusAndPaymentMethodIds(
    ctx: Ctx,
    status: TransactionStatus,
    paymentMethodIds: string[],
  ): Promise<Transaction[]>;

  /**
   * Get completed transaction count per event (for event ranking). Returns map eventId -> count.
   */
  getCompletedTransactionCountByEventIds(
    ctx: Ctx,
    eventIds: string[],
  ): Promise<Map<string, number>>;

  /**
   * Count completed ticket units sold by a seller (sum of quantity on Completed transactions).
   */
  countCompletedBySellerId(ctx: Ctx, sellerId: string): Promise<number>;

  /**
   * Count completed ticket units bought by a buyer (sum of quantity on Completed transactions).
   */
  countCompletedByBuyerId(ctx: Ctx, buyerId: string): Promise<number>;

  getAuditLogsByTransactionId(
    ctx: Ctx,
    transactionId: string,
    order: 'asc' | 'desc',
  ): Promise<{
    items: Array<{
      id: string;
      transactionId: string;
      action: 'created' | 'updated';
      changedAt: Date;
      changedBy: string;
      payload: unknown;
    }>;
    total: number;
  }>;
}

/**
 * Injection token for ITransactionsRepository
 */
export const TRANSACTIONS_REPOSITORY = Symbol('ITransactionsRepository');
