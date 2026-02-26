import { Injectable, OnModuleInit } from '@nestjs/common';
import { KeyValueFileStorage } from '../../common/storage/key-value-file-storage';
import type { Ctx } from '../../common/types/context';
import type { Transaction } from './transactions.domain';
import { TransactionStatus } from './transactions.domain';

@Injectable()
export class TransactionsRepository implements OnModuleInit {
  private readonly storage: KeyValueFileStorage<Transaction>;

  constructor() {
    this.storage = new KeyValueFileStorage<Transaction>('transactions');
  }

  /**
   * Load data from file storage when module initializes
   */
  async onModuleInit(): Promise<void> {
    await this.storage.onModuleInit();
  }

  /**
   * Create a new transaction
   */
  async create(ctx: Ctx, transaction: Transaction): Promise<Transaction> {
    await this.storage.set(ctx, transaction.id, transaction);
    return transaction;
  }

  /**
   * Find transaction by ID
   */
  async findById(ctx: Ctx, id: string): Promise<Transaction | undefined> {
    return await this.storage.get(ctx, id);
  }

  /**
   * Get all transactions
   */
  async getAll(ctx: Ctx): Promise<Transaction[]> {
    return await this.storage.getAll(ctx);
  }

  /**
   * Get transactions by buyer
   */
  async getByBuyerId(ctx: Ctx, buyerId: string): Promise<Transaction[]> {
    const all = await this.storage.getAll(ctx);
    return all
      .filter((t) => t.buyerId === buyerId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  /**
   * Get transactions by seller
   */
  async getBySellerId(ctx: Ctx, sellerId: string): Promise<Transaction[]> {
    const all = await this.storage.getAll(ctx);
    return all
      .filter((t) => t.sellerId === sellerId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  /**
   * Get transactions by listing
   */
  async getByListingId(ctx: Ctx, listingId: string): Promise<Transaction[]> {
    const all = await this.storage.getAll(ctx);
    return all.filter((t) => t.listingId === listingId);
  }

  /**
   * Get transactions pending auto-release
   */
  async getPendingAutoRelease(ctx: Ctx): Promise<Transaction[]> {
    const all = await this.storage.getAll(ctx);
    const now = new Date();
    return all.filter(
      (t) =>
        t.status === TransactionStatus.TicketTransferred &&
        t.autoReleaseAt &&
        new Date(t.autoReleaseAt) <= now,
    );
  }

  /**
   * Update transaction
   */
  async update(
    ctx: Ctx,
    id: string,
    updates: Partial<Transaction>,
  ): Promise<Transaction | undefined> {
    const existing = await this.storage.get(ctx, id);
    if (!existing) return undefined;

    const updated: Transaction = {
      ...existing,
      ...updates,
      id: existing.id,
      updatedAt: new Date(),
    };
    await this.storage.set(ctx, id, updated);
    return updated;
  }

  /**
   * Get transactions by listing IDs
   */
  async getByListingIds(
    ctx: Ctx,
    listingIds: string[],
  ): Promise<Transaction[]> {
    if (listingIds.length === 0) return [];
    const all = await this.storage.getAll(ctx);
    const listingIdSet = new Set(listingIds);
    return all.filter((t) => listingIdSet.has(t.listingId));
  }

  /**
   * Get paginated transactions with optional filters.
   * Filters are OR'd: match transactionIds OR buyerId in buyerIds OR sellerId in sellerIds.
   */
  async getPaginated(
    ctx: Ctx,
    page: number,
    limit: number,
    filters?: {
      transactionIds?: string[];
      buyerIds?: string[];
      sellerIds?: string[];
    },
  ): Promise<{ transactions: Transaction[]; total: number }> {
    let all = await this.storage.getAll(ctx);

    if (filters) {
      const { transactionIds, buyerIds, sellerIds } = filters;
      const transactionIdSet = transactionIds?.length
        ? new Set(transactionIds)
        : undefined;
      const buyerIdSet = buyerIds?.length
        ? new Set(buyerIds)
        : undefined;
      const sellerIdSet = sellerIds?.length
        ? new Set(sellerIds)
        : undefined;

      all = all.filter((t) => {
        if (transactionIdSet?.has(t.id)) return true;
        if (buyerIdSet?.has(t.buyerId)) return true;
        if (sellerIdSet?.has(t.sellerId)) return true;
        return false;
      });
    }

    const sorted = all.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const total = sorted.length;
    const start = (page - 1) * limit;
    const transactions = sorted.slice(start, start + limit);

    return { transactions, total };
  }

  /**
   * Get transactions by IDs (batch).
   */
  async findByIds(
    ctx: Ctx,
    ids: string[],
  ): Promise<Transaction[]> {
    if (ids.length === 0) return [];
    return await this.storage.getMany(ctx, ids);
  }

  /**
   * Count transactions by status values.
   */
  async countByStatuses(
    ctx: Ctx,
    statuses: TransactionStatus[],
  ): Promise<number> {
    if (statuses.length === 0) return 0;
    const statusSet = new Set(statuses);
    const all = await this.storage.getAll(ctx);
    return all.filter((transaction) => statusSet.has(transaction.status)).length;
  }

  /**
   * Get transaction IDs by status values.
   */
  async getIdsByStatuses(
    ctx: Ctx,
    statuses: TransactionStatus[],
  ): Promise<string[]> {
    if (statuses.length === 0) return [];
    const statusSet = new Set(statuses);
    const all = await this.storage.getAll(ctx);
    return all
      .filter((transaction) => statusSet.has(transaction.status))
      .map((transaction) => transaction.id);
  }
}
