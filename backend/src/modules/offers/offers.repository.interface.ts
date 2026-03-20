import type { Ctx } from '../../common/types/context';
import type { Offer, OfferExpiredReason } from './offers.domain';

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
        | 'expiredAt'
        | 'expiredReason'
      >
    >,
  ): Promise<Offer | undefined>;

  /**
   * Batch-expire pending offers whose expiresAt has passed (reason: seller_no_response).
   * Returns count of updated rows.
   */
  expirePendingByIds(ctx: Ctx, ids: string[], expiredAt: Date): Promise<number>;

  /**
   * Batch-expire accepted offers whose acceptedExpiresAt has passed (reason: buyer_no_purchase).
   * Returns count of updated rows.
   */
  expireAcceptedByIds(ctx: Ctx, ids: string[], expiredAt: Date): Promise<number>;

  /**
   * Find pending offers whose expiresAt is before `before`, up to `limit`.
   */
  findExpirablePending(ctx: Ctx, before: Date, limit: number): Promise<Offer[]>;

  /**
   * Find accepted offers whose acceptedExpiresAt is before `before`, up to `limit`.
   */
  findExpirableAccepted(ctx: Ctx, before: Date, limit: number): Promise<Offer[]>;

  findPendingOrAcceptedByListingId(
    ctx: Ctx,
    listingId: string,
  ): Promise<Offer[]>;
}
