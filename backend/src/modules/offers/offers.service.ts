import {
  Injectable,
  Inject,
  forwardRef,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import type { IOffersRepository } from './offers.repository.interface';
import { OFFERS_REPOSITORY } from './offers.repository.interface';
import { TicketsService } from '../tickets/tickets.service';
import { PlatformConfigService } from '../config/config.service';
import { ContextLogger } from '../../common/logger/context-logger';
import type { Ctx } from '../../common/types/context';
import type { Offer, OfferTickets } from './offers.domain';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationEventType } from '../notifications/notifications.domain';
import type {
  CreateOfferRequest,
  OfferWithListingSummary,
  OfferListingSummary,
  OfferWithReceivedContext,
  OfferReceivedContext,
} from './offers.api';
import type { TicketListingWithEvent } from '../tickets/tickets.domain';
import { TicketUnitStatus } from '../tickets/tickets.domain';
import { UsersService } from '../users/users.service';
import { FireAndForget } from '../../common/utils/fire-and-forget';
import { EventsService } from '../events/events.service';

@Injectable()
export class OffersService {
  private readonly logger = new ContextLogger(OffersService.name);

  constructor(
    @Inject(OFFERS_REPOSITORY)
    private readonly offersRepository: IOffersRepository,
    @Inject(forwardRef(() => TicketsService))
    private readonly ticketsService: TicketsService,
    @Inject(PlatformConfigService)
    private readonly platformConfigService: PlatformConfigService,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => EventsService))
    private readonly eventsService: EventsService,
  ) {}

  private generateId(): string {
    return `off_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }

  /**
   * Create an offer. Validates: listing has best offer enabled, offeredPrice >= minimumPrice,
   * one active offer per user per listing.
   */
  async createOffer(
    ctx: Ctx,
    userId: string,
    body: CreateOfferRequest,
  ): Promise<Offer> {
    const listing = await this.ticketsService.getListingById(
      ctx,
      body.listingId,
    );
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
    await this.eventsService.assertEventDateNotExpired(ctx, listing.eventDateId);
    if (listing.sellerId === userId) {
      throw new BadRequestException('Cannot make an offer on your own listing');
    }
    if (listing.status !== 'Active') {
      throw new BadRequestException('Listing is not available for offers');
    }

    const config = listing.bestOfferConfig;
    if (!config?.enabled) {
      throw new BadRequestException('This listing does not accept offers');
    }
    if (
      body.offeredPrice.currency !== config.minimumPrice.currency ||
      body.offeredPrice.amount < config.minimumPrice.amount
    ) {
      throw new BadRequestException(
        'Offer is below the minimum price accepted by the seller',
      );
    }

    const existing = await this.offersRepository.findActiveByUserAndListing(
      ctx,
      userId,
      body.listingId,
    );
    if (existing) {
      throw new BadRequestException(
        'You already have an active offer on this listing. Wait for the seller to respond or for it to expire.',
      );
    }

    this.validateOfferTickets(body.tickets, listing);

    const platformConfig =
      await this.platformConfigService.getPlatformConfig(ctx);
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + platformConfig.offerPendingExpirationMinutes * 60 * 1000,
    );

    const offer: Offer = {
      id: this.generateId(),
      listingId: body.listingId,
      userId,
      offeredPrice: body.offeredPrice,
      status: 'pending',
      tickets: body.tickets,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    };

    const created = await this.offersRepository.create(ctx, offer);
    this.logger.log(
      ctx,
      `Created offer ${created.id} for listing ${body.listingId}`,
    );

    FireAndForget.run(
      ctx,
      async (cleanCtx) => {
        await this.notificationsService.emit(cleanCtx, NotificationEventType.OFFER_RECEIVED, {
          offerId: created.id,
          listingId: body.listingId,
          eventName: listing.eventName,
          sellerId: listing.sellerId,
          offeredAmount: created.offeredPrice.amount,
          currency: created.offeredPrice.currency,
        });
      },
      this.logger,
      'Failed to emit OFFER_RECEIVED',
    );

    return created;
  }

  private validateOfferTickets(
    tickets: OfferTickets,
    listing: TicketListingWithEvent,
  ): void {
    const available = listing.ticketUnits.filter(
      (u) => u.status === TicketUnitStatus.Available,
    );
    if (tickets.type === 'numbered') {
      if (!tickets.seats?.length) {
        throw new BadRequestException(
          'Numbered offer must specify at least one seat',
        );
      }
      const availableSeats = new Set(
        available
          .filter((u) => u.seat)
          .map((u) => `${u.seat!.row}:${u.seat!.seatNumber}`),
      );
      for (const seat of tickets.seats) {
        const key = `${seat.row}:${seat.seatNumber}`;
        if (!availableSeats.has(key)) {
          throw new BadRequestException(
            `Seat ${seat.row}-${seat.seatNumber} is not available on this listing`,
          );
        }
      }
    } else {
      if (tickets.count < 1 || tickets.count > available.length) {
        throw new BadRequestException(
          `Unnumbered offer count must be between 1 and ${available.length}`,
        );
      }
    }
  }

  async getOfferById(ctx: Ctx, id: string): Promise<Offer | undefined> {
    return this.offersRepository.findById(ctx, id);
  }

  async listOffersByListing(
    ctx: Ctx,
    listingId: string,
    sellerId: string,
  ): Promise<Offer[]> {
    const listing = await this.ticketsService.getListingById(ctx, listingId);
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.sellerId !== sellerId) {
      throw new ForbiddenException(
        'You can only view offers for your own listings',
      );
    }
    const offers = await this.offersRepository.findByListingId(ctx, listingId);
    return this.applyLazyExpiration(ctx, offers);
  }

  async listReceivedOffers(
    ctx: Ctx,
    sellerId: string,
  ): Promise<OfferWithReceivedContext[]> {
    const myListings = await this.ticketsService.getMyListings(ctx, sellerId);
    const listingIds = myListings.map((l) => l.id);
    if (listingIds.length === 0) return [];
    const listingMap = new Map(myListings.map((l) => [l.id, l]));
    const offers = await this.offersRepository.findByListingIds(
      ctx,
      listingIds,
    );
    const expiredApplied = await this.applyLazyExpiration(ctx, offers);
    if (expiredApplied.length === 0) return [];
    const buyerIds = [...new Set(expiredApplied.map((o) => o.userId))];
    const buyers = await this.usersService.findByIds(ctx, buyerIds);
    const buyerNameMap = new Map(
      buyers.map((u) => [u.id, u.publicName ?? 'Unknown']),
    );
    return expiredApplied.map((offer): OfferWithReceivedContext => {
      const listing = listingMap.get(offer.listingId);
      const context: OfferReceivedContext = listing
        ? {
            listingId: listing.id,
            eventName: listing.eventName,
            eventSlug: listing.eventSlug,
            eventDate:
              listing.eventDate instanceof Date
                ? listing.eventDate.toISOString()
                : String(listing.eventDate),
            sectionName:
              listing.sectionName?.trim() ||
              String(listing.type ?? '') ||
              'General',
            listingPrice: listing.pricePerTicket,
            bannerUrls: listing.bannerUrls,
            buyerName: buyerNameMap.get(offer.userId) ?? 'Unknown',
          }
        : {
            listingId: offer.listingId,
            eventName: 'Unknown Event',
            eventSlug: 'event-' + offer.listingId,
            eventDate: new Date().toISOString(),
            sectionName: 'General',
            listingPrice: { amount: 0, currency: 'EUR' },
            buyerName: buyerNameMap.get(offer.userId) ?? 'Unknown',
          };
      return { ...offer, receivedContext: context };
    });
  }

  async listMyOffers(
    ctx: Ctx,
    userId: string,
  ): Promise<OfferWithListingSummary[]> {
    const offers = await this.offersRepository.findByUserId(ctx, userId);
    const expiredApplied = await this.applyLazyExpiration(ctx, offers);
    if (expiredApplied.length === 0) return [];

    const listingIds = [...new Set(expiredApplied.map((o) => o.listingId))];
    const listings = await this.ticketsService.getListingsByIds(
      ctx,
      listingIds,
    );
    const listingMap = new Map(listings.map((l) => [l.id, l]));

    const sellerIds = [...new Set(listings.map((l) => l.sellerId))];
    const sellers = await this.usersService.findByIds(ctx, sellerIds);
    const sellerNameMap = new Map(
      sellers.map((u) => [u.id, u.publicName ?? 'Unknown']),
    );

    return expiredApplied.map((offer): OfferWithListingSummary => {
      const listing = listingMap.get(offer.listingId);
      const summary: OfferListingSummary = listing
        ? {
            eventName: listing.eventName,
            eventSlug: listing.eventSlug,
            eventDate:
              listing.eventDate instanceof Date
                ? listing.eventDate.toISOString()
                : String(listing.eventDate),
            sellerName: sellerNameMap.get(listing.sellerId) ?? 'Unknown',
            bannerUrls: listing.bannerUrls,
          }
        : {
            eventName: 'Unknown Event',
            eventSlug: 'event-unknown',
            eventDate: new Date().toISOString(),
            sellerName: 'Unknown',
          };
      return { ...offer, listingSummary: summary };
    });
  }

  /**
   * Mark expired offers as expired (lazy, on read). Handles both:
   * - pending offers past expiresAt         → expired / seller_no_response
   * - accepted offers past acceptedExpiresAt → expired / buyer_no_purchase
   */
  private async applyLazyExpiration(
    ctx: Ctx,
    offers: Offer[],
  ): Promise<Offer[]> {
    const now = new Date();

    const expiredPending = offers.filter(
      (o) => o.status === 'pending' && o.expiresAt < now,
    );
    const expiredAccepted = offers.filter(
      (o) =>
        o.status === 'accepted' &&
        o.acceptedExpiresAt !== undefined &&
        o.acceptedExpiresAt < now,
    );

    const [pendingIds, acceptedIds] = [
      expiredPending.map((o) => o.id),
      expiredAccepted.map((o) => o.id),
    ];

    await Promise.all([
      pendingIds.length > 0
        ? this.offersRepository.expirePendingByIds(ctx, pendingIds, now)
        : Promise.resolve(0),
      acceptedIds.length > 0
        ? this.offersRepository.expireAcceptedByIds(ctx, acceptedIds, now)
        : Promise.resolve(0),
    ]);

    const expiredIdSet = new Set([...pendingIds, ...acceptedIds]);
    return offers.map((offer) => {
      if (!expiredIdSet.has(offer.id)) return offer;
      const reason =
        pendingIds.includes(offer.id)
          ? ('seller_no_response' as const)
          : ('buyer_no_purchase' as const);
      return { ...offer, status: 'expired' as const, expiredAt: now, expiredReason: reason };
    });
  }

  /**
   * Called by the scheduler: proactively expire pending and accepted offers
   * whose deadlines have passed. Returns counts for logging.
   */
  async expireStaleOffers(
    ctx: Ctx,
    batchLimit: number,
  ): Promise<{ expiredPending: number; expiredAccepted: number }> {
    const now = new Date();
    const [pendingOffers, acceptedOffers] = await Promise.all([
      this.offersRepository.findExpirablePending(ctx, now, batchLimit),
      this.offersRepository.findExpirableAccepted(ctx, now, batchLimit),
    ]);

    const [expiredPending, expiredAccepted] = await Promise.all([
      this.offersRepository.expirePendingByIds(
        ctx,
        pendingOffers.map((o) => o.id),
        now,
      ),
      this.offersRepository.expireAcceptedByIds(
        ctx,
        acceptedOffers.map((o) => o.id),
        now,
      ),
    ]);

    const allExpired = [...pendingOffers, ...acceptedOffers];
    if (allExpired.length > 0) {
      FireAndForget.run(
        ctx,
        async (cleanCtx) => {
          const listingIds = [...new Set(allExpired.map((o) => o.listingId))];
          const listings = await this.ticketsService.getListingsByIds(cleanCtx, listingIds);
          const listingMap = new Map(listings.map((l) => [l.id, l]));

          await Promise.all(
            allExpired.map((offer) => {
              const listing = listingMap.get(offer.listingId);
              if (!listing) return Promise.resolve();
              const expiredReason = pendingOffers.some((o) => o.id === offer.id)
                ? ('seller_no_response' as const)
                : ('buyer_no_purchase' as const);
              return this.notificationsService.emit(
                cleanCtx,
                NotificationEventType.OFFER_EXPIRED,
                {
                  offerId: offer.id,
                  listingId: offer.listingId,
                  eventName: listing.eventName,
                  buyerId: offer.userId,
                  sellerId: listing.sellerId,
                  expiredReason,
                },
              );
            }),
          );
        },
        this.logger,
        'Failed to emit OFFER_EXPIRED notifications',
      );
    }

    return { expiredPending, expiredAccepted };
  }

  async acceptOffer(
    ctx: Ctx,
    offerId: string,
    sellerId: string,
  ): Promise<Offer> {
    const offer = await this.offersRepository.findById(ctx, offerId);
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.status !== 'pending') {
      throw new BadRequestException('Offer is not pending');
    }

    const listing = await this.ticketsService.getListingById(
      ctx,
      offer.listingId,
    );
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.sellerId !== sellerId) {
      throw new ForbiddenException(
        'You can only accept offers on your own listings',
      );
    }

    const now = new Date();
    if (offer.expiresAt < now) {
      await this.offersRepository.update(ctx, offerId, {
        status: 'cancelled',
        cancelledAt: now,
      });
      throw new BadRequestException('Offer has expired');
    }

    const platformConfig =
      await this.platformConfigService.getPlatformConfig(ctx);
    const acceptedExpiresAt = new Date(
      now.getTime() + platformConfig.offerAcceptedExpirationMinutes * 60 * 1000,
    );

    const updated = await this.offersRepository.update(ctx, offerId, {
      status: 'accepted',
      acceptedAt: now,
      acceptedExpiresAt,
    });
    if (!updated) throw new NotFoundException('Offer not found');
    this.logger.log(ctx, `Offer ${offerId} accepted by seller ${sellerId}`);
    FireAndForget.run(
      ctx,
      async (cleanCtx) => {
        await this.notificationsService.emit(cleanCtx, NotificationEventType.OFFER_ACCEPTED, {
          offerId: updated.id,
          listingId: updated.listingId,
          eventName: listing.eventName,
          buyerId: updated.userId,
          offeredAmount: updated.offeredPrice.amount,
          currency: updated.offeredPrice.currency,
        });
      },
      this.logger,
      'Failed to emit OFFER_ACCEPTED',
    );
    return updated;
  }

  async rejectOffer(
    ctx: Ctx,
    offerId: string,
    sellerId: string,
  ): Promise<Offer> {
    const offer = await this.offersRepository.findById(ctx, offerId);
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.status !== 'pending') {
      throw new BadRequestException('Offer is not pending');
    }

    const listing = await this.ticketsService.getListingById(
      ctx,
      offer.listingId,
    );
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.sellerId !== sellerId) {
      throw new ForbiddenException(
        'You can only reject offers on your own listings',
      );
    }

    const now = new Date();
    const updated = await this.offersRepository.update(ctx, offerId, {
      status: 'rejected',
      rejectedAt: now,
    });
    if (!updated) throw new NotFoundException('Offer not found');
    FireAndForget.run(
      ctx,
      async (cleanCtx) => {
        await this.notificationsService.emit(cleanCtx, NotificationEventType.OFFER_REJECTED, {
          offerId: updated.id,
          listingId: updated.listingId,
          eventName: listing.eventName,
          buyerId: updated.userId,
        });
      },
      this.logger,
      'Failed to emit OFFER_REJECTED',
    );
    return updated;
  }

  /**
   * Mark an offer as converted after the buyer completed purchase (called from TransactionsService).
   */
  async markConverted(
    ctx: Ctx,
    offerId: string,
    transactionId: string,
  ): Promise<void> {
    const updated = await this.offersRepository.update(ctx, offerId, {
      status: 'converted',
      convertedTransactionId: transactionId,
    });
    if (!updated) {
      this.logger.log(ctx, `Offer ${offerId} not found when marking converted`);
    }
  }

  /**
   * After a purchase (direct or from converted offer), cancel offers that can no longer be satisfied.
   */
  async cancelAffectedOffers(ctx: Ctx, listingId: string): Promise<void> {
    const listing = await this.ticketsService.getListingById(ctx, listingId);
    if (!listing) return;

    const availableUnitIds = listing.ticketUnits
      .filter((u) => u.status === TicketUnitStatus.Available)
      .map((u) => u.id);
    const availableSeats = new Set(
      listing.ticketUnits
        .filter((u) => u.status === TicketUnitStatus.Available && u.seat)
        .map((u) => `${u.seat!.row}:${u.seat!.seatNumber}`),
    );
    const availableCount = availableUnitIds.length;

    const offers = await this.offersRepository.findPendingOrAcceptedByListingId(
      ctx,
      listingId,
    );
    const now = new Date();
    for (const offer of offers) {
      let satisfiable = true;
      if (offer.tickets.type === 'numbered') {
        for (const seat of offer.tickets.seats) {
          const key = `${seat.row}:${seat.seatNumber}`;
          if (!availableSeats.has(key)) {
            satisfiable = false;
            break;
          }
        }
      } else {
        if (offer.tickets.count > availableCount) satisfiable = false;
      }
      if (!satisfiable) {
        await this.offersRepository.update(ctx, offer.id, {
          status: 'cancelled',
          cancelledAt: now,
        });
        this.logger.log(
          ctx,
          `Cancelled offer ${offer.id} (no longer satisfiable)`,
        );
        FireAndForget.run(
          ctx,
          async (cleanCtx) => {
            await this.notificationsService.emit(cleanCtx, NotificationEventType.OFFER_CANCELLED, {
              offerId: offer.id,
              listingId: offer.listingId,
              eventName: listing.eventName,
              buyerId: offer.userId,
              reason: 'Tickets were sold or no longer available',
            });
          },
          this.logger,
          'Failed to emit OFFER_CANCELLED',
        );
      }
    }
  }

  /**
   * Buyer-view offers by IDs (for paginated activity history).
   */
  async getOffersWithListingSummaryByIds(
    ctx: Ctx,
    offerIds: string[],
  ): Promise<OfferWithListingSummary[]> {
    if (offerIds.length === 0) return [];
    let offers = await this.offersRepository.findByIds(ctx, offerIds);
    offers = await this.applyLazyExpiration(ctx, offers);
    if (offers.length === 0) return [];
    const listingIds = [...new Set(offers.map((o) => o.listingId))];
    const listings = await this.ticketsService.getListingsByIds(
      ctx,
      listingIds,
    );
    const listingMap = new Map(listings.map((l) => [l.id, l]));
    const sellerIds = [...new Set(listings.map((l) => l.sellerId))];
    const sellers = await this.usersService.findByIds(ctx, sellerIds);
    const sellerNameMap = new Map(
      sellers.map((u) => [u.id, u.publicName ?? 'Unknown']),
    );
    return offers.map((offer): OfferWithListingSummary => {
      const listing = listingMap.get(offer.listingId);
      const summary: OfferListingSummary = listing
        ? {
            eventName: listing.eventName,
            eventSlug: listing.eventSlug,
            eventDate:
              listing.eventDate instanceof Date
                ? listing.eventDate.toISOString()
                : String(listing.eventDate),
            sellerName: sellerNameMap.get(listing.sellerId) ?? 'Unknown',
            bannerUrls: listing.bannerUrls,
          }
        : {
            eventName: 'Unknown Event',
            eventSlug: 'event-unknown',
            eventDate: new Date().toISOString(),
            sellerName: 'Unknown',
          };
      return { ...offer, listingSummary: summary };
    });
  }

  /**
   * Seller-view offers by IDs (for paginated activity history).
   */
  async getOffersWithReceivedContextByIds(
    ctx: Ctx,
    offerIds: string[],
  ): Promise<OfferWithReceivedContext[]> {
    if (offerIds.length === 0) return [];
    let offers = await this.offersRepository.findByIds(ctx, offerIds);
    offers = await this.applyLazyExpiration(ctx, offers);
    if (offers.length === 0) return [];
    const listingIds = [...new Set(offers.map((o) => o.listingId))];
    const listings = await this.ticketsService.getListingsByIds(
      ctx,
      listingIds,
    );
    const listingMap = new Map(listings.map((l) => [l.id, l]));
    const buyerIds = [...new Set(offers.map((o) => o.userId))];
    const buyers = await this.usersService.findByIds(ctx, buyerIds);
    const buyerNameMap = new Map(
      buyers.map((u) => [u.id, u.publicName ?? 'Unknown']),
    );
    return offers.map((offer): OfferWithReceivedContext => {
      const listing = listingMap.get(offer.listingId);
      const context: OfferReceivedContext = listing
        ? {
            listingId: listing.id,
            eventName: listing.eventName,
            eventSlug: listing.eventSlug,
            eventDate:
              listing.eventDate instanceof Date
                ? listing.eventDate.toISOString()
                : String(listing.eventDate),
            sectionName:
              listing.sectionName?.trim() ||
              String(listing.type ?? '') ||
              'General',
            listingPrice: listing.pricePerTicket,
            bannerUrls: listing.bannerUrls,
            buyerName: buyerNameMap.get(offer.userId) ?? 'Unknown',
          }
        : {
            listingId: offer.listingId,
            eventName: 'Unknown Event',
            eventSlug: 'event-' + offer.listingId,
            eventDate: new Date().toISOString(),
            sectionName: 'General',
            listingPrice: { amount: 0, currency: 'EUR' },
            buyerName: buyerNameMap.get(offer.userId) ?? 'Unknown',
          };
      return { ...offer, receivedContext: context };
    });
  }
}
