import type { Ctx } from '../../../common/types/context';
import type { PricingSnapshot } from './pricing.domain';

/**
 * Pricing repository interface
 */
export interface IPricingRepository {
  /**
   * Create a new pricing snapshot
   */
  create(ctx: Ctx, snapshot: PricingSnapshot): Promise<PricingSnapshot>;

  /**
   * Find a pricing snapshot by ID
   */
  findById(ctx: Ctx, id: string): Promise<PricingSnapshot | undefined>;

  /**
   * Update a pricing snapshot
   */
  update(
    ctx: Ctx,
    id: string,
    updates: Partial<PricingSnapshot>,
  ): Promise<PricingSnapshot | undefined>;

  /**
   * Delete expired and unconsumed snapshots
   * Returns the number of deleted snapshots
   */
  deleteExpired(ctx: Ctx): Promise<number>;
}

/**
 * Injection token for IPricingRepository
 */
export const PRICING_REPOSITORY = Symbol('IPricingRepository');
