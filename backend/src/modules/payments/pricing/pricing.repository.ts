import { Injectable, OnModuleInit } from '@nestjs/common';
import { KeyValueFileStorage } from '../../../common/storage/key-value-file-storage';
import type { Ctx } from '../../../common/types/context';
import type { PricingSnapshot } from './pricing.domain';

@Injectable()
export class PricingRepository implements OnModuleInit {
  private readonly storage: KeyValueFileStorage<PricingSnapshot>;

  constructor() {
    this.storage = new KeyValueFileStorage<PricingSnapshot>('pricing-snapshots');
  }

  async onModuleInit(): Promise<void> {
    await this.storage.onModuleInit();
  }

  async create(ctx: Ctx, snapshot: PricingSnapshot): Promise<PricingSnapshot> {
    await this.storage.set(ctx, snapshot.id, snapshot);
    return snapshot;
  }

  async findById(ctx: Ctx, id: string): Promise<PricingSnapshot | undefined> {
    return await this.storage.get(ctx, id);
  }

  async update(
    ctx: Ctx,
    id: string,
    updates: Partial<PricingSnapshot>,
  ): Promise<PricingSnapshot | undefined> {
    const existing = await this.storage.get(ctx, id);
    if (!existing) return undefined;

    const updated: PricingSnapshot = {
      ...existing,
      ...updates,
      id: existing.id,
    };
    await this.storage.set(ctx, id, updated);
    return updated;
  }

  async deleteExpired(ctx: Ctx): Promise<number> {
    const all = await this.storage.getAll(ctx);
    const now = new Date();
    let deleted = 0;

    for (const snapshot of all) {
      const expiresAt = new Date(snapshot.expiresAt);
      if (expiresAt < now && !snapshot.consumedByTransactionId) {
        await this.storage.delete(ctx, snapshot.id);
        deleted++;
      }
    }

    return deleted;
  }
}
