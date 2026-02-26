import { Injectable, OnModuleInit } from '@nestjs/common';
import { KeyValueFileStorage } from '../../common/storage/key-value-file-storage';
import type { Ctx } from '../../common/types/context';
import type { PaymentMethodOption } from './payments.domain';

@Injectable()
export class PaymentMethodsRepository implements OnModuleInit {
  private readonly storage: KeyValueFileStorage<PaymentMethodOption>;

  constructor() {
    this.storage = new KeyValueFileStorage<PaymentMethodOption>(
      'payment-methods',
    );
  }

  async onModuleInit(): Promise<void> {
    await this.storage.onModuleInit();
  }

  async findAll(ctx: Ctx): Promise<PaymentMethodOption[]> {
    return await this.storage.getAll(ctx);
  }

  async findById(
    ctx: Ctx,
    id: string,
  ): Promise<PaymentMethodOption | undefined> {
    return await this.storage.get(ctx, id);
  }

  async findEnabled(ctx: Ctx): Promise<PaymentMethodOption[]> {
    const all = await this.storage.getAll(ctx);
    return all.filter((pm) => pm.status === 'enabled');
  }

  async create(
    ctx: Ctx,
    paymentMethod: PaymentMethodOption,
  ): Promise<PaymentMethodOption> {
    await this.storage.set(ctx, paymentMethod.id, paymentMethod);
    return paymentMethod;
  }

  async update(
    ctx: Ctx,
    id: string,
    updates: Partial<PaymentMethodOption>,
  ): Promise<PaymentMethodOption | undefined> {
    const existing = await this.storage.get(ctx, id);
    if (!existing) return undefined;

    const updated: PaymentMethodOption = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };
    await this.storage.set(ctx, id, updated);
    return updated;
  }

  async delete(ctx: Ctx, id: string): Promise<boolean> {
    const existing = await this.storage.get(ctx, id);
    if (!existing) return false;
    await this.storage.delete(ctx, id);
    return true;
  }
}
