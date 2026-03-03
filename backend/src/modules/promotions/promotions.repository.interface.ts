import type { Ctx } from '../../common/types/context';
import type { Promotion, PromotionStatus, PromotionType } from './promotions.domain';

export interface ListPromotionsFilters {
  status?: PromotionStatus;
  type?: PromotionType;
  userId?: string;
}

export interface IPromotionsRepository {
  create(ctx: Ctx, promotion: Omit<Promotion, 'id' | 'createdAt'>): Promise<Promotion>;

  findById(ctx: Ctx, id: string): Promise<Promotion | undefined>;

  findActiveByUserIdAndType(
    ctx: Ctx,
    userId: string,
    type: PromotionType,
  ): Promise<Promotion | undefined>;

  list(ctx: Ctx, filters?: ListPromotionsFilters): Promise<Promotion[]>;

  updateStatus(ctx: Ctx, id: string, status: PromotionStatus): Promise<Promotion | undefined>;

  /**
   * Increment usedCount and append listingId to usedInListingIds.
   * Must be called within a transaction when applying promotion to a listing.
   */
  incrementUsedAndAddListingId(
    ctx: Ctx,
    id: string,
    listingId: string,
  ): Promise<Promotion | undefined>;

  /**
   * Set status to inactive for all promotions of the given type for the given user.
   */
  deactivateByUserIdAndType(
    ctx: Ctx,
    userId: string,
    type: PromotionType,
  ): Promise<number>;
}

export const PROMOTIONS_REPOSITORY = Symbol('IPromotionsRepository');
