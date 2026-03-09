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

    this.notificationsService
      .emit(ctx, NotificationEventType.OFFER_RECEIVED, {
        offerId: created.id,
        listingId: body.listingId,
        eventName: listing.eventName,
        sellerId: listing.sellerId,
        offeredAmount: created.offeredPrice.amount,
        currency: created.offeredPrice.currency,
      })
      .catch((err) =>
        this.logger.error(ctx, `Failed to emit OFFER_RECEIVED: ${err}`),
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
            listingPrice: listing.pricePerTicket,
            bannerUrls: listing.bannerUrls,
            buyerName: buyerNameMap.get(offer.userId) ?? 'Unknown',
          }
        : {
            listingId: offer.listingId,
            eventName: 'Unknown Event',
            eventSlug: 'event-' + offer.listingId,
            eventDate: new Date().toISOString(),
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

  /** Mark expired pending offers as cancelled (lazy). */
  private async applyLazyExpiration(
    ctx: Ctx,
    offers: Offer[],
  ): Promise<Offer[]> {
    const now = new Date();
    const result: Offer[] = [];
    for (const offer of offers) {
      if (offer.status === 'pending' && offer.expiresAt < now) {
        const cancelled = await this.offersRepository.update(ctx, offer.id, {
          status: 'cancelled',
          cancelledAt: now,
        });
        result.push(
          cancelled ?? { ...offer, status: 'cancelled', cancelledAt: now },
        );
      } else {
        result.push(offer);
      }
    }
    return result;
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
    this.notificationsService
      .emit(ctx, NotificationEventType.OFFER_ACCEPTED, {
        offerId: updated.id,
        listingId: updated.listingId,
        eventName: listing.eventName,
        buyerId: updated.userId,
        offeredAmount: updated.offeredPrice.amount,
        currency: updated.offeredPrice.currency,
      })
      .catch((err) =>
        this.logger.error(ctx, `Failed to emit OFFER_ACCEPTED: ${err}`),
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
    this.notificationsService
      .emit(ctx, NotificationEventType.OFFER_REJECTED, {
        offerId: updated.id,
        listingId: updated.listingId,
        eventName: listing.eventName,
        buyerId: updated.userId,
      })
      .catch((err) =>
        this.logger.error(ctx, `Failed to emit OFFER_REJECTED: ${err}`),
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
        this.notificationsService
          .emit(ctx, NotificationEventType.OFFER_CANCELLED, {
            offerId: offer.id,
            listingId: offer.listingId,
            eventName: listing.eventName,
            buyerId: offer.userId,
            reason: 'Tickets were sold or no longer available',
          })
          .catch((err) =>
            this.logger.error(ctx, `Failed to emit OFFER_CANCELLED: ${err}`),
          );
      }
    }
  }
}
