import type { Ctx } from '../../common/types/context';
import type { Offer } from './offers.domain';

export const OFFERS_REPOSITORY = Symbol('OFFERS_REPOSITORY');

export interface IOffersRepository {
  create(ctx: Ctx, offer: Offer): Promise<Offer>;
  findById(ctx: Ctx, id: string): Promise<Offer | undefined>;
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
  findPendingOrAcceptedByListingId(
    ctx: Ctx,
    listingId: string,
  ): Promise<Offer[]>;
}
