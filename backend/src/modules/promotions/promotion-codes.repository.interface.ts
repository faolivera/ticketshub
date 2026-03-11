import type { Ctx } from '../../common/types/context';
import type { PromotionCode } from './promotions.domain';

export interface IPromotionCodesRepository {
  create(
    ctx: Ctx,
    data: Omit<PromotionCode, 'id' | 'createdAt'>,
  ): Promise<PromotionCode>;

  findByCode(ctx: Ctx, code: string): Promise<PromotionCode | undefined>;

  findById(ctx: Ctx, id: string): Promise<PromotionCode | undefined>;

  list(ctx: Ctx): Promise<PromotionCode[]>;

  incrementUsedCount(ctx: Ctx, id: string): Promise<PromotionCode | undefined>;
}

export const PROMOTION_CODES_REPOSITORY = Symbol('IPromotionCodesRepository');
