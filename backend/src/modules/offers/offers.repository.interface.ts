import type { Ctx } from '../../common/types/context';
import type { Offer } from './offers.domain';

export const OFFERS_REPOSITORY = Symbol('OFFERS_REPOSITORY');

export interface IOffersRepository {
  create(ctx: Ctx, offer: Offer): Promise<Offer>;
  findById(ctx: Ctx, id: string): Promise<Offer | undefined>;
  findByIds(ctx: Ctx, ids: string[]): Promise<Offer[]>;
  findByListingId(ctx: Ctx, listingId: string): Promise<Offer[]>;
  findByListingIds(ctx: Ctx, listingIds: string[]): Promise<Offer[]>;
  findByUserId(ctx: Ctx, userId: string): Promise<Offer[]>;
  findActiveByUserAndListing(
    ctx: Ctx,
    userId: string,
    listingId: string,
  ): Promise<Offer | undefined>;
  update(
    ctx: Ctx,
    id: string,
    updates: Partial<
      Pick<
        Offer,
        | 'status'
        | 'acceptedAt'
        | 'acceptedExpiresAt'
        | 'rejectedAt'
        | 'convertedTransactionId'
        | 'cancelledAt'
      >
    >,
  ): Promise<Offer | undefined>;

  /**
   * Mark pending offers as cancelled by IDs (batch). Only affects offers with status pending.
   */
  cancelExpiredPendingByIds(
    ctx: Ctx,
    ids: string[],
    cancelledAt: Date,
  ): Promise<number>;

  findPendingOrAcceptedByListingId(
    ctx: Ctx,
    listingId: string,
  ): Promise<Offer[]>;
}
