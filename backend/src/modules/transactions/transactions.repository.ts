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
}
