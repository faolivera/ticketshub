import { Injectable, OnModuleInit } from '@nestjs/common';
import { KeyValueFileStorage } from '../../common/storage/key-value-file-storage';
import type { Ctx } from '../../common/types/context';
import type { PaymentIntent } from './payments.domain';

@Injectable()
export class PaymentsRepository implements OnModuleInit {
  private readonly storage: KeyValueFileStorage<PaymentIntent>;

  constructor() {
    this.storage = new KeyValueFileStorage<PaymentIntent>('payments');
  }

  /**
   * Load data from file storage when module initializes
   */
  async onModuleInit(): Promise<void> {
    await this.storage.onModuleInit();
  }

  /**
   * Create payment intent
   */
  async create(ctx: Ctx, payment: PaymentIntent): Promise<PaymentIntent> {
    await this.storage.set(ctx, payment.id, payment);
    return payment;
  }

  /**
   * Get payment intent by ID
   */
  async findById(ctx: Ctx, id: string): Promise<PaymentIntent | undefined> {
    return await this.storage.get(ctx, id);
  }

  /**
   * Get payment intent by transaction ID
   */
  async findByTransactionId(ctx: Ctx, transactionId: string): Promise<PaymentIntent | undefined> {
    const all = await this.storage.getAll(ctx);
    return all.find((p) => p.transactionId === transactionId);
  }

  /**
   * Get payment intent by provider ID
   */
  async findByProviderPaymentId(ctx: Ctx, providerPaymentId: string): Promise<PaymentIntent | undefined> {
    const all = await this.storage.getAll(ctx);
    return all.find((p) => p.providerPaymentId === providerPaymentId);
  }

  /**
   * Update payment intent
   */
  async update(ctx: Ctx, id: string, updates: Partial<PaymentIntent>): Promise<PaymentIntent | undefined> {
    const existing = await this.storage.get(ctx, id);
    if (!existing) return undefined;

    const updated: PaymentIntent = {
      ...existing,
      ...updates,
      id: existing.id,
      updatedAt: new Date(),
    };
    await this.storage.set(ctx, id, updated);
    return updated;
  }
}
