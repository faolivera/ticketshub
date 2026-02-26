import { Injectable, OnModuleInit } from '@nestjs/common';
import { KeyValueFileStorage } from '../../common/storage/key-value-file-storage';
import type { Ctx } from '../../common/types/context';
import type { PaymentConfirmation } from './payment-confirmations.domain';
import { PaymentConfirmationStatus } from './payment-confirmations.domain';

@Injectable()
export class PaymentConfirmationsRepository implements OnModuleInit {
  private readonly storage: KeyValueFileStorage<PaymentConfirmation>;

  constructor() {
    this.storage = new KeyValueFileStorage<PaymentConfirmation>(
      'payment-confirmations',
    );
  }

  async onModuleInit(): Promise<void> {
    await this.storage.onModuleInit();
  }

  async findById(ctx: Ctx, id: string): Promise<PaymentConfirmation | null> {
    return (await this.storage.get(ctx, id)) ?? null;
  }

  async findByTransactionId(
    ctx: Ctx,
    transactionId: string,
  ): Promise<PaymentConfirmation | null> {
    const all = await this.storage.getAll(ctx);
    return all.find((c) => c.transactionId === transactionId) ?? null;
  }

  async findAllPending(ctx: Ctx): Promise<PaymentConfirmation[]> {
    const all = await this.storage.getAll(ctx);
    return all.filter((c) => c.status === PaymentConfirmationStatus.Pending);
  }

  /**
   * Count pending payment confirmations.
   */
  async countPending(ctx: Ctx): Promise<number> {
    const all = await this.storage.getAll(ctx);
    return all.filter((c) => c.status === PaymentConfirmationStatus.Pending)
      .length;
  }

  /**
   * Get transaction IDs that have pending payment confirmations.
   */
  async getPendingTransactionIds(ctx: Ctx): Promise<string[]> {
    const all = await this.storage.getAll(ctx);
    return all
      .filter((c) => c.status === PaymentConfirmationStatus.Pending)
      .map((c) => c.transactionId);
  }

  /**
   * Find payment confirmations by transaction IDs (batch).
   */
  async findByTransactionIds(
    ctx: Ctx,
    transactionIds: string[],
  ): Promise<PaymentConfirmation[]> {
    if (transactionIds.length === 0) return [];
    const idSet = new Set(transactionIds);
    const all = await this.storage.getAll(ctx);
    return all.filter((c) => idSet.has(c.transactionId));
  }

  async save(
    ctx: Ctx,
    confirmation: PaymentConfirmation,
  ): Promise<PaymentConfirmation> {
    await this.storage.set(ctx, confirmation.id, confirmation);
    return confirmation;
  }

  async delete(ctx: Ctx, id: string): Promise<void> {
    await this.storage.delete(ctx, id);
  }
}
