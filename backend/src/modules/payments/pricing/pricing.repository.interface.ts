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

  /**
   * Atomically consume a pricing snapshot.
   * Uses WHERE conditions to ensure single-use:
   * - id matches
   * - consumedByTransactionId IS NULL (not yet consumed)
   * - expiresAt > NOW() (not expired)
   * - listingId matches
   *
   * Returns the snapshot if consumed, undefined if already consumed/expired/mismatch.
   */
  consumeAtomic(
    ctx: Ctx,
    snapshotId: string,
    listingId: string,
    transactionId: string,
    selectedPaymentMethodId: string,
  ): Promise<PricingSnapshot | undefined>;
}

/**
 * Injection token for IPricingRepository
 */
export const PRICING_REPOSITORY = Symbol('IPricingRepository');
