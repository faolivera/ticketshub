import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  forwardRef,
} from '@nestjs/common';
import { SellerRiskRestrictionException } from '../../common/exceptions/seller-risk-restriction.exception';
import { randomBytes } from 'crypto';
import type { ITicketsRepository } from './tickets.repository.interface';
import { TICKETS_REPOSITORY } from './tickets.repository.interface';
import { EventsService } from '../events/events.service';
import { TransactionManager } from '../../common/database';
import type { Ctx } from '../../common/types/context';
import type {
  TicketListing,
  TicketListingWithEvent,
  TicketUnit,
  Money,
} from './tickets.domain';
import {
  TicketType,
  DeliveryMethod,
  ListingStatus,
  TicketUnitStatus,
  SeatingType,
} from './tickets.domain';
import type {
  CreateListingRequest,
  CreateListingTicketUnitInput,
  UpdateListingRequest,
  ListListingsQuery,
} from './tickets.api';
import { UsersService } from '../users/users.service';
import {
  SellerTier,
  VerificationHelper,
} from '../../common/utils/verification-helper';
import {
  EventStatus,
  EventDateStatus,
  EventSectionStatus,
} from '../events/events.domain';
import { PromotionsService } from '../promotions/promotions.service';
import { PromotionCodesService } from '../promotions/promotion-codes.service';
import type { Promotion } from '../promotions/promotions.domain';
import { PromotionType } from '../promotions/promotions.domain';
import { TermsService } from '../terms/terms.service';
import { TermsUserType } from '../terms/terms.domain';
import type { Money as ConfigMoney } from '../config/config.domain';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { PlatformConfigService } from '../config/config.service';
import { ConversionService } from '../config/conversion.service';
import { ContextLogger } from '../../common/logger/context-logger';
import { EventScoringService } from '../event-scoring/event-scoring.service';

@Injectable()
export class TicketsService {
  private readonly logger = new ContextLogger(TicketsService.name);

  constructor(
    @Inject(TICKETS_REPOSITORY)
    private readonly ticketsRepository: ITicketsRepository,
    @Inject(forwardRef(() => EventsService))
    private readonly eventsService: EventsService,
    private readonly usersService: UsersService,
    private readonly txManager: TransactionManager,
    private readonly promotionsService: PromotionsService,
    private readonly promotionCodesService: PromotionCodesService,
    private readonly termsService: TermsService,
    private readonly configService: PlatformConfigService,
    private readonly conversionService: ConversionService,
    private readonly nestConfigService: NestConfigService,
    @Inject(forwardRef(() => EventScoringService))
    private readonly eventScoringService: EventScoringService,
  ) {}

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `tkt_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }

  private generateUnitId(): string {
    return `unit_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }

  private getAvailableUnitIds(listing: TicketListing): string[] {
    return listing.ticketUnits
      .filter((unit) => unit.status === TicketUnitStatus.Available)
      .map((unit) => unit.id);
  }

  /**
   * Total value and count of active listings for a seller (Tier 0 limit).
   * Value per listing = pricePerTicket.amount * ticketUnits.length (minor units).
   * Optionally exclude one listing by id (e.g. when updating that listing).
   */
  private async getActiveListingsTotalsForSeller(
    ctx: Ctx,
    sellerId: string,
    excludeListingId?: string,
  ): Promise<{ count: number; amounts: ConfigMoney[] }> {
    const listings = await this.ticketsRepository.getBySellerId(ctx, sellerId);
    const active = listings.filter((l) => l.status === ListingStatus.Active);
    const toSum = excludeListingId
      ? active.filter((l) => l.id !== excludeListingId)
      : active;
    const amounts: ConfigMoney[] = toSum.map((l) => ({
      amount: l.pricePerTicket.amount * l.ticketUnits.length,
      currency: l.pricePerTicket.currency,
    }));
    return { count: toSum.length, amounts };
  }

  /**
   * Check whether adding/updating a listing would pass Tier 0 (unverified seller) limits.
   * Callers only invoke this when seller is not VERIFIED_SELLER. Runs proximity validation when eventStartsAt is provided (event within configured hours window => not allowed).
   * @param options.excludeListingId When updating an existing listing, pass its id so it is excluded from current totals and re-counted with newListingValue.
   * @param options.eventStartsAt When provided, runs proximity check; if event is within window, returns false.
   * @returns true if within limits and proximity ok, false otherwise (caller should throw SellerRiskRestrictionException or return seller_risk_restriction).
   */
  private async checkUnverifiedSellerListingLimits(
    ctx: Ctx,
    sellerId: string,
    newListingValue: ConfigMoney,
    options?: {
      excludeListingId?: string;
      eventStartsAt?: Date;
    },
  ): Promise<boolean> {
    const excludeListingId = options?.excludeListingId;
    const config = await this.configService.getPlatformConfig(ctx);

    // Proximity: unverified sellers cannot list for events within the configured hours window (caller already ensured we're in unverified path)
    if (options?.eventStartsAt) {
      const proximityHours =
        config?.riskEngine?.buyer?.phoneRequiredEventHours ??
        this.nestConfigService.get<number>(
          'platform.riskEngine.buyer.phoneRequiredEventHours',
        )!;
      const hoursUntilEvent =
        (options.eventStartsAt.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntilEvent >= 0 && hoursUntilEvent <= proximityHours) {
        return false;
      }
    }

    const re = config.riskEngine.seller;
    const { count: activeCount, amounts: activeAmounts } =
      await this.getActiveListingsTotalsForSeller(ctx, sellerId, excludeListingId);
    const newCount = activeCount + 1;
    if (newCount > re.unverifiedSellerMaxSales) {
      return false;
    }
    const totalInLimitCurrency = await this.conversionService.sumInCurrency(
      ctx,
      [...activeAmounts, newListingValue],
      re.unverifiedSellerMaxAmount.currency,
    );
    return totalInLimitCurrency.amount <= re.unverifiedSellerMaxAmount.amount;
  }

  private validateListingSeatingConsistency(
    ticketUnits: TicketUnit[],
    seatingType: SeatingType,
  ): void {
    const hasSeatUnits = ticketUnits.some((unit) => unit.seat);
    const hasSeatlessUnits = ticketUnits.some((unit) => !unit.seat);

    if (hasSeatUnits && hasSeatlessUnits) {
      throw new BadRequestException('Listing ticket units must be homogeneous');
    }

    if (seatingType === SeatingType.Numbered && hasSeatlessUnits) {
      throw new BadRequestException(
        'Numbered listings require seat information for all units',
      );
    }

    if (seatingType === SeatingType.Unnumbered && hasSeatUnits) {
      throw new BadRequestException(
        'Unnumbered listings cannot contain seat information',
      );
    }
  }

  private buildTicketUnits(
    data: CreateListingRequest,
    sectionSeatingType: SeatingType,
  ): TicketUnit[] {
    const hasQuantity = data.quantity !== undefined;
    const hasTicketUnits =
      Array.isArray(data.ticketUnits) && data.ticketUnits.length > 0;

    if (hasQuantity === hasTicketUnits) {
      throw new BadRequestException('Provide either quantity or ticketUnits');
    }

    if (hasQuantity) {
      if (sectionSeatingType !== SeatingType.Unnumbered) {
        throw new BadRequestException(
          'Quantity can only be used for unnumbered sections',
        );
      }
      if (!data.quantity || data.quantity < 1) {
        throw new BadRequestException('Quantity must be at least 1');
      }
      return Array.from({ length: data.quantity }, () => ({
        id: this.generateUnitId(),
        listingId: '',
        status: TicketUnitStatus.Available,
        version: 1,
      }));
    }

    const incomingUnits = (
      data.ticketUnits as CreateListingTicketUnitInput[]
    ).map((unit) => ({
      id: this.generateUnitId(),
      listingId: '',
      status: TicketUnitStatus.Available,
      seat: unit.seat,
      version: 1,
    }));

    const hasNumbered = incomingUnits.some((unit) => unit.seat);
    const hasUnnumbered = incomingUnits.some((unit) => !unit.seat);
    if (hasNumbered && hasUnnumbered) {
      throw new BadRequestException(
        'All ticket units must be either numbered or unnumbered',
      );
    }

    if (hasNumbered) {
      if (sectionSeatingType !== SeatingType.Numbered) {
        throw new BadRequestException(
          'Numbered ticket units require a numbered section',
        );
      }
      const seatKeySet = new Set<string>();
      for (const unit of incomingUnits) {
        if (
          !unit.seat ||
          !unit.seat.row.trim() ||
          !unit.seat.seatNumber.trim()
        ) {
          throw new BadRequestException(
            'Each numbered unit must include row and seatNumber',
          );
        }
        const seatKey = `${unit.seat.row.trim().toLowerCase()}::${unit.seat.seatNumber.trim().toLowerCase()}`;
        if (seatKeySet.has(seatKey)) {
          throw new BadRequestException(
            'Duplicate seat detected in ticketUnits',
          );
        }
        seatKeySet.add(seatKey);
      }
    } else if (sectionSeatingType !== SeatingType.Unnumbered) {
      throw new BadRequestException(
        'Unnumbered ticket units require an unnumbered section',
      );
    }

    return incomingUnits;
  }

  /**
   * Determine listing status based on event, event date, and event section approval status
   */
  private determineListingStatus(
    eventStatus: EventStatus,
    eventDateStatus: EventDateStatus,
    eventSectionStatus: EventSectionStatus,
  ): ListingStatus {
    const eventApproved = eventStatus === EventStatus.Approved;
    const dateApproved = eventDateStatus === EventDateStatus.Approved;
    const sectionApproved = eventSectionStatus === EventSectionStatus.Approved;

    if (eventApproved && dateApproved && sectionApproved) {
      return ListingStatus.Active;
    }

    return ListingStatus.Pending;
  }

  /**
   * Validate whether the seller can create a listing from a risk perspective (Tier 0 limits).
   * Does not validate event, terms, or other createListing rules. Used by the sell wizard before advancing from the price step.
   */
  async validateListingRisk(
    ctx: Ctx,
    sellerId: string,
    data: { quantity: number; pricePerTicket: ConfigMoney },
  ): Promise<{ status: 'can_create' | 'seller_risk_restriction' }> {
    const user = await this.usersService.findById(ctx, sellerId);
    if (!user || !VerificationHelper.canSell(user)) {
      throw new ForbiddenException(
        'Only sellers with verified email and phone can create listings',
      );
    }
    if (VerificationHelper.sellerTier(user) === SellerTier.VERIFIED_SELLER) {
      return { status: 'can_create' };
    }
    const newListingValue: ConfigMoney = {
      amount: data.pricePerTicket.amount * data.quantity,
      currency: data.pricePerTicket.currency,
    };
    const withinLimits = await this.checkUnverifiedSellerListingLimits(
      ctx,
      sellerId,
      newListingValue,
    );
    return withinLimits ? { status: 'can_create' } : { status: 'seller_risk_restriction' };
  }

  /**
   * Create a new listing
   */
  async createListing(
    ctx: Ctx,
    sellerId: string,
    data: CreateListingRequest,
  ): Promise<TicketListingWithEvent> {
    const user = await this.usersService.findById(ctx, sellerId);
    if (!user || !VerificationHelper.canSell(user)) {
      throw new ForbiddenException(
        'Only sellers with verified email and phone can create listings',
      );
    }

    const hasAcceptedSellerTerms =
      await this.termsService.hasAcceptedCurrentTerms(
        ctx,
        sellerId,
        TermsUserType.Seller,
      );
    if (!hasAcceptedSellerTerms) {
      throw new BadRequestException('Must accept seller terms first');
    }

    // Validate required fields
    if (!data.type) {
      throw new BadRequestException('Ticket type is required');
    }

    const validTicketTypes = Object.values(TicketType);
    if (!validTicketTypes.includes(data.type)) {
      throw new BadRequestException('Invalid ticket type');
    }

    if (!data.eventDateId) {
      throw new BadRequestException('Event date is required');
    }

    if (!data.eventSectionId) {
      throw new BadRequestException('Event section is required');
    }

    // Validate event exists
    const event = await this.eventsService.getEventById(ctx, data.eventId);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Reject if event is rejected
    if (event.status === EventStatus.Rejected) {
      throw new BadRequestException(
        'Cannot create listing for a rejected event',
      );
    }

    // Validate event date exists
    const eventDate = event.dates.find((d) => d.id === data.eventDateId);
    if (!eventDate) {
      throw new NotFoundException('Event date not found');
    }

    // Reject if event date is rejected or cancelled
    if (
      eventDate.status === EventDateStatus.Rejected ||
      eventDate.status === EventDateStatus.Cancelled
    ) {
      throw new BadRequestException(
        'Cannot create listing for a rejected or cancelled event date',
      );
    }

    if (eventDate.date < new Date()) {
      throw new BadRequestException('Cannot create listing for a past event date');
    }

    // Validate event section exists
    const eventSection = event.sections.find(
      (s) => s.id === data.eventSectionId,
    );
    if (!eventSection) {
      throw new NotFoundException('Event section not found');
    }

    // Reject if section is rejected
    if (eventSection.status === EventSectionStatus.Rejected) {
      throw new BadRequestException(
        'Cannot create listing for a rejected section',
      );
    }

    // Not fully verified: enforce max count, max total value, and proximity (no V3 => no listing for events within X hours)
    const tier = VerificationHelper.sellerTier(user);
    if (tier !== SellerTier.VERIFIED_SELLER) {
      const newListingQuantity = data.quantity ?? data.ticketUnits?.length ?? 0;
      const newListingValue: ConfigMoney = {
        amount: data.pricePerTicket.amount * newListingQuantity,
        currency: data.pricePerTicket.currency,
      };
      const withinLimits = await this.checkUnverifiedSellerListingLimits(
        ctx,
        sellerId,
        newListingValue,
        { eventStartsAt: eventDate.date },
      );
      if (!withinLimits) {
        throw new SellerRiskRestrictionException();
      }
    }

    // Validate physical ticket requirements
    if (data.type === TicketType.Physical) {
      if (!data.deliveryMethod) {
        throw new BadRequestException(
          'Delivery method is required for physical tickets',
        );
      }
      if (
        data.deliveryMethod === DeliveryMethod.Pickup &&
        !data.pickupAddress
      ) {
        throw new BadRequestException(
          'Pickup address is required for pickup delivery',
        );
      }
    }

    const ticketUnits = this.buildTicketUnits(data, eventSection.seatingType);

    // Use seller's default currency (reuse user already loaded above)
    const listingCurrency = user.currency;

    // Determine listing status based on event, date, and section approval
    const listingStatus = this.determineListingStatus(
      event.status,
      eventDate.status,
      eventSection.status,
    );

    this.validateListingSeatingConsistency(
      ticketUnits,
      eventSection.seatingType,
    );

    this.validateBestOfferConfig(
      data.bestOfferConfig,
      data.pricePerTicket,
      listingCurrency,
    );

    const created = await this.txManager.executeInTransaction(
      ctx,
      async (txCtx) => {
        let activePromotion: Promotion | null = null;
        if (data.promotionCode?.trim()) {
          try {
            const claimed = await this.promotionCodesService.claimPromotionCode(
              txCtx,
              'seller',
              data.promotionCode.trim(),
              sellerId,
            );
            activePromotion = claimed;
          } catch (err) {
            this.logger.warn(ctx, 'Promotion code claim failed in createListing', {
              code: data.promotionCode,
              error: err,
            });
            throw err;
          }
        }
        if (!activePromotion) {
          activePromotion = await this.promotionsService.getActiveForUser(
            txCtx,
            sellerId,
            PromotionType.SELLER_DISCOUNTED_FEE,
          );
        }
        const hasPromotion =
          activePromotion &&
          (activePromotion.maxUsages === 0 ||
            activePromotion.usedCount < activePromotion.maxUsages);

        const listing: TicketListing = {
          id: this.generateId(),
          sellerId,
          eventId: data.eventId,
          eventDateId: data.eventDateId,
          type: data.type,
          ticketUnits,
          sellTogether: data.sellTogether || false,
          pricePerTicket: {
            amount: data.pricePerTicket.amount,
            currency: listingCurrency,
          },
          deliveryMethod: data.deliveryMethod,
          pickupAddress: data.pickupAddress,
          eventSectionId: data.eventSectionId,
          promotionSnapshot: hasPromotion
            ? this.promotionsService.toSnapshot(activePromotion)
            : undefined,
          bestOfferConfig: data.bestOfferConfig,
          status: listingStatus,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const createdListing = await this.ticketsRepository.create(
          txCtx,
          listing,
        );
        if (hasPromotion && activePromotion) {
          await this.promotionsService.incrementUsedAndAddListingId(
            txCtx,
            activePromotion.id,
            createdListing.id,
          );
        }
        return createdListing;
      },
    );

    void this.eventScoringService
      .requestScoring(ctx, data.eventId)
      .catch((err) =>
        this.logger.error(ctx, 'Event scoring enqueue failed', {
          eventId: data.eventId,
          error: err,
        }),
      );

    return await this.enrichListingWithEvent(ctx, created);
  }

  /**
   * Get listing by ID with event info
   */
  async getListingById(ctx: Ctx, id: string): Promise<TicketListingWithEvent> {
    const listing = await this.ticketsRepository.findById(ctx, id);
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    return await this.enrichListingWithEvent(ctx, listing);
  }

  /**
   * Get listings by IDs with event info (batch).
   * Returns only found listings; does not throw for missing IDs.
   */
  async getListingsByIds(
    ctx: Ctx,
    ids: string[],
  ): Promise<TicketListingWithEvent[]> {
    if (ids.length === 0) return [];
    const listings = await this.ticketsRepository.findByIds(ctx, ids);
    if (listings.length === 0) return [];

    const eventIds = [...new Set(listings.map((l) => l.eventId))];
    const events = await this.eventsService.getEventsByIds(ctx, eventIds);
    const eventMap = new Map(events.map((e) => [e.id, e]));

    return listings.map((listing) => {
      const event = eventMap.get(listing.eventId);
      const eventDate = event?.dates.find((d) => d.id === listing.eventDateId);
      const eventSection = event?.sections.find(
        (s) => s.id === listing.eventSectionId,
      );

      let pendingReason: string[] | undefined;
      if (listing.status === ListingStatus.Pending && event) {
        const reasons: string[] = [];
        if (event.status !== EventStatus.Approved) {
          reasons.push('event');
        }
        if (eventDate?.status !== EventDateStatus.Approved) {
          reasons.push('date');
        }
        if (eventSection?.status !== EventSectionStatus.Approved) {
          reasons.push('section');
        }
        if (reasons.length > 0) {
          pendingReason = reasons;
        }
      }

      return {
        ...listing,
        seatingType: eventSection?.seatingType ?? SeatingType.Unnumbered,
        eventName: event?.name ?? 'Unknown Event',
        eventSlug: event?.slug ?? 'event-' + listing.eventId,
        eventDate: eventDate?.date ?? new Date(),
        venue: event?.venue ?? 'Unknown',
        sectionName: eventSection?.name ?? 'Unknown',
        pendingReason,
        bannerUrls: event?.bannerUrls,
      };
    });
  }

  /**
   * Enrich listing with event information
   */
  private async enrichListingWithEvent(
    ctx: Ctx,
    listing: TicketListing,
  ): Promise<TicketListingWithEvent> {
    const event = await this.eventsService.getEventById(ctx, listing.eventId);
    const eventDate = event.dates.find((d) => d.id === listing.eventDateId);
    const eventSection = event.sections.find(
      (s) => s.id === listing.eventSectionId,
    );

    let pendingReason: string[] | undefined;
    if (listing.status === ListingStatus.Pending) {
      const reasons: string[] = [];
      if (event.status !== EventStatus.Approved) {
        reasons.push('event');
      }
      if (eventDate?.status !== EventDateStatus.Approved) {
        reasons.push('date');
      }
      if (eventSection?.status !== EventSectionStatus.Approved) {
        reasons.push('section');
      }
      if (reasons.length > 0) {
        pendingReason = reasons;
      }
    }

    return {
      ...listing,
      seatingType: eventSection?.seatingType ?? SeatingType.Unnumbered,
      eventName: event.name,
      eventSlug: event.slug,
      eventDate: eventDate?.date || new Date(),
      venue: event.venue,
      sectionName: eventSection?.name || 'Unknown',
      pendingReason,
      bannerUrls: event.bannerUrls,
    };
  }

  /**
   * Enrich multiple listings with event information (batch).
   */
  private async enrichListingsWithEvent(
    ctx: Ctx,
    listings: TicketListing[],
  ): Promise<TicketListingWithEvent[]> {
    if (listings.length === 0) return [];

    const eventIds = [...new Set(listings.map((l) => l.eventId))];
    const events = await this.eventsService.getEventsByIds(ctx, eventIds);
    const eventMap = new Map(events.map((e) => [e.id, e]));

    return listings.map((listing) => {
      const event = eventMap.get(listing.eventId);
      const eventDate = event?.dates.find((d) => d.id === listing.eventDateId);
      const eventSection = event?.sections.find(
        (s) => s.id === listing.eventSectionId,
      );

      let pendingReason: string[] | undefined;
      if (listing.status === ListingStatus.Pending && event) {
        const reasons: string[] = [];
        if (event.status !== EventStatus.Approved) {
          reasons.push('event');
        }
        if (eventDate?.status !== EventDateStatus.Approved) {
          reasons.push('date');
        }
        if (eventSection?.status !== EventSectionStatus.Approved) {
          reasons.push('section');
        }
        if (reasons.length > 0) {
          pendingReason = reasons;
        }
      }

      return {
        ...listing,
        seatingType: eventSection?.seatingType ?? SeatingType.Unnumbered,
        eventName: event?.name ?? 'Unknown Event',
        eventSlug: event?.slug ?? 'event-' + listing.eventId,
        eventDate: eventDate?.date ?? new Date(),
        venue: event?.venue ?? 'Unknown',
        sectionName: eventSection?.name ?? 'Unknown',
        pendingReason,
        bannerUrls: event?.bannerUrls,
      };
    });
  }

  /**
   * List listings with optional filters
   */
  async listListings(
    ctx: Ctx,
    query: ListListingsQuery,
  ): Promise<TicketListingWithEvent[]> {
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 20;

    const opts = {
      eventId: query.eventId,
      eventDateId: query.eventDateId,
      sellerId: query.sellerId,
      type: query.type,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      limit,
      offset,
    };
    const { listings } = await this.ticketsRepository.listListingsPaginated(
      ctx,
      opts,
    );
    return this.enrichListingsWithEvent(ctx, listings);
  }

  /**
   * Lowest listing price per event (active listings with ≥1 available unit).
   * Amount is minor units (e.g. cents), same as listing API.
   */
  async getMinActiveListingPriceByEventIds(
    ctx: Ctx,
    eventIds: string[],
  ): Promise<Map<string, { amount: number; currency: string }>> {
    return this.ticketsRepository.getMinActiveListingPriceByEventIds(
      ctx,
      eventIds,
    );
  }

  /**
   * Update a listing
   * Uses pessimistic locking (FOR UPDATE) to prevent concurrent modifications,
   * combined with version check for additional safety
   */
  async updateListing(
    ctx: Ctx,
    listingId: string,
    sellerId: string,
    updates: UpdateListingRequest,
  ): Promise<TicketListing> {
    return this.txManager.executeInTransaction(ctx, async (txCtx) => {
      const listing = await this.ticketsRepository.findByIdForUpdate(
        txCtx,
        listingId,
      );
      if (!listing) {
        throw new NotFoundException('Listing not found');
      }

      if (listing.sellerId !== sellerId) {
        throw new ForbiddenException('You can only update your own listings');
      }

      if (listing.status !== ListingStatus.Active) {
        throw new BadRequestException('Can only update active listings');
      }

      const effectivePrice = updates.pricePerTicket ?? listing.pricePerTicket;
      this.validateBestOfferConfig(
        updates.bestOfferConfig ?? undefined,
        effectivePrice,
        effectivePrice.currency,
      );

      // Tier 0: ensure updated total value does not exceed limit and proximity (no V3 => no listing for events within X hours)
      const user = await this.usersService.findById(txCtx, sellerId);
      const sellerTier = user ? VerificationHelper.sellerTier(user) : undefined;
      if (user && sellerTier !== SellerTier.VERIFIED_SELLER) {
        const event = await this.eventsService.getEventById(txCtx, listing.eventId);
        const eventDate = event?.dates.find((d) => d.id === listing.eventDateId);
        const thisListingValue: ConfigMoney = {
          amount: effectivePrice.amount * listing.ticketUnits.length,
          currency: effectivePrice.currency,
        };
        const withinLimits = await this.checkUnverifiedSellerListingLimits(
          txCtx,
          listing.sellerId,
          thisListingValue,
          {
            excludeListingId: listing.id,
            eventStartsAt: eventDate?.date,
          },
        );
        if (!withinLimits) {
          throw new SellerRiskRestrictionException();
        }
      }

      const updatesToApply =
        updates.bestOfferConfig === null
          ? { ...updates, bestOfferConfig: undefined }
          : updates;

      return await this.ticketsRepository.updateWithVersion(
        txCtx,
        listingId,
        updatesToApply,
        listing.version,
      );
    });
  }

  /**
   * Validate bestOfferConfig: when enabled, minimumPrice is required and must be <= pricePerTicket.
   */
  private validateBestOfferConfig(
    config: { enabled: boolean; minimumPrice?: Money } | undefined | null,
    pricePerTicket: Money,
    currency: string,
  ): void {
    if (!config || !config.enabled) return;
    if (
      !config.minimumPrice ||
      config.minimumPrice.currency !== currency ||
      config.minimumPrice.amount > pricePerTicket.amount
    ) {
      throw new BadRequestException(
        'When offers are enabled, minimumPrice is required, must match listing currency, and must be less than or equal to price per ticket',
      );
    }
  }

  /**
   * Cancel a listing
   * Uses pessimistic locking to prevent race with purchase
   */
  async cancelListing(
    ctx: Ctx,
    listingId: string,
    sellerId: string,
  ): Promise<TicketListing> {
    const updated = await this.txManager.executeInTransaction(ctx, async (txCtx) => {
      const listing = await this.ticketsRepository.findByIdForUpdate(
        txCtx,
        listingId,
      );
      if (!listing) {
        throw new NotFoundException('Listing not found');
      }

      if (listing.sellerId !== sellerId) {
        throw new ForbiddenException('You can only cancel your own listings');
      }

      if (listing.status !== ListingStatus.Active) {
        throw new BadRequestException('Can only cancel active listings');
      }

      const hasReserved = listing.ticketUnits.some(
        (u) => u.status === TicketUnitStatus.Reserved,
      );
      if (hasReserved) {
        throw new BadRequestException(
          'Cannot cancel listing with reserved tickets. Wait for transaction to complete.',
        );
      }

      return await this.ticketsRepository.updateWithVersion(
        txCtx,
        listingId,
        { status: ListingStatus.Cancelled },
        listing.version,
      );
    });

    void this.eventScoringService
      .requestScoring(ctx, updated.eventId)
      .catch((err) =>
        this.logger.error(ctx, 'Event scoring enqueue failed', {
          eventId: updated.eventId,
          error: err,
        }),
      );

    return updated;
  }

  /**
   * Get my listings
   */
  async getMyListings(
    ctx: Ctx,
    sellerId: string,
  ): Promise<TicketListingWithEvent[]> {
    const listings = await this.ticketsRepository.getBySellerId(ctx, sellerId);
    return this.enrichListingsWithEvent(ctx, listings);
  }

  /**
   * Reserve tickets for purchase (internal use by Transactions)
   * Uses pessimistic locking to prevent double-booking
   */
  async reserveTickets(
    ctx: Ctx,
    listingId: string,
    ticketUnitIds: string[],
  ): Promise<TicketListing> {
    return this.txManager.executeInTransaction(ctx, async (txCtx) => {
      const listing = await this.ticketsRepository.findByIdForUpdate(
        txCtx,
        listingId,
      );
      if (!listing) {
        throw new NotFoundException('Listing not found');
      }

      if (listing.status !== ListingStatus.Active) {
        throw new BadRequestException('Listing is not available');
      }

      if (!ticketUnitIds.length) {
        throw new BadRequestException(
          'At least one ticket unit must be selected',
        );
      }

      if (new Set(ticketUnitIds).size !== ticketUnitIds.length) {
        throw new BadRequestException(
          'Duplicate ticket unit IDs are not allowed',
        );
      }

      const availableUnitIds = this.getAvailableUnitIds(listing);
      if (ticketUnitIds.some((id) => !availableUnitIds.includes(id))) {
        throw new BadRequestException(
          'One or more ticket units are not available',
        );
      }

      if (
        listing.sellTogether &&
        ticketUnitIds.length !== availableUnitIds.length
      ) {
        throw new BadRequestException('Must purchase all tickets together');
      }

      return await this.ticketsRepository.reserveUnitsWithLock(
        txCtx,
        listingId,
        ticketUnitIds,
      );
    });
  }

  /**
   * Restore tickets (when transaction is cancelled)
   * Uses pessimistic locking to prevent concurrent collision
   */
  async restoreTickets(
    ctx: Ctx,
    listingId: string,
    ticketUnitIds: string[],
  ): Promise<TicketListing | undefined> {
    return this.txManager.executeInTransaction(ctx, async (txCtx) => {
      const listing = await this.ticketsRepository.findByIdForUpdate(
        txCtx,
        listingId,
      );
      if (!listing) {
        return undefined;
      }

      return await this.ticketsRepository.restoreUnitsWithLock(
        txCtx,
        listingId,
        ticketUnitIds,
      );
    });
  }

  /**
   * Activate pending listings for an event.
   * Called when an event is approved.
   * Only activates listings whose event date and section are also approved.
   */
  async activatePendingListingsForEvent(
    ctx: Ctx,
    eventId: string,
  ): Promise<number> {
    const event = await this.eventsService.getEventById(ctx, eventId);
    if (!event || event.status !== EventStatus.Approved) {
      return 0;
    }

    const pendingListings = await this.ticketsRepository.getPendingByEventId(
      ctx,
      eventId,
    );

    const approvedDateIds = new Set(
      event.dates
        .filter((d) => d.status === EventDateStatus.Approved)
        .map((d) => d.id),
    );

    const approvedSectionIds = new Set(
      event.sections
        .filter((s) => s.status === EventSectionStatus.Approved)
        .map((s) => s.id),
    );

    const listingsToActivate = pendingListings.filter(
      (listing) =>
        approvedDateIds.has(listing.eventDateId) &&
        approvedSectionIds.has(listing.eventSectionId),
    );

    if (listingsToActivate.length === 0) {
      return 0;
    }

    return await this.ticketsRepository.bulkUpdateStatus(
      ctx,
      listingsToActivate.map((l) => l.id),
      ListingStatus.Active,
    );
  }

  /**
   * Activate pending listings for an event date.
   * Called when an event date is approved.
   * Only activates if the parent event and section are also approved.
   */
  async activatePendingListingsForEventDate(
    ctx: Ctx,
    eventDateId: string,
    eventId: string,
  ): Promise<number> {
    const event = await this.eventsService.getEventById(ctx, eventId);
    if (!event || event.status !== EventStatus.Approved) {
      return 0;
    }

    const eventDate = event.dates.find((d) => d.id === eventDateId);
    if (!eventDate || eventDate.status !== EventDateStatus.Approved) {
      return 0;
    }

    const approvedSectionIds = new Set(
      event.sections
        .filter((s) => s.status === EventSectionStatus.Approved)
        .map((s) => s.id),
    );

    const pendingListings =
      await this.ticketsRepository.getPendingByEventDateId(ctx, eventDateId);

    const listingsToActivate = pendingListings.filter((listing) =>
      approvedSectionIds.has(listing.eventSectionId),
    );

    if (listingsToActivate.length === 0) {
      return 0;
    }

    return await this.ticketsRepository.bulkUpdateStatus(
      ctx,
      listingsToActivate.map((l) => l.id),
      ListingStatus.Active,
    );
  }

  /**
   * Activate pending listings for an event section.
   * Called when an event section is approved.
   * Only activates if the parent event and event date are also approved.
   */
  async activatePendingListingsForEventSection(
    ctx: Ctx,
    eventSectionId: string,
    eventId: string,
  ): Promise<number> {
    const event = await this.eventsService.getEventById(ctx, eventId);
    if (!event || event.status !== EventStatus.Approved) {
      return 0;
    }

    const approvedDateIds = new Set(
      event.dates
        .filter((d) => d.status === EventDateStatus.Approved)
        .map((d) => d.id),
    );

    const pendingListings =
      await this.ticketsRepository.getPendingByEventSectionId(
        ctx,
        eventSectionId,
      );

    const listingsToActivate = pendingListings.filter((listing) =>
      approvedDateIds.has(listing.eventDateId),
    );

    if (listingsToActivate.length === 0) {
      return 0;
    }

    return await this.ticketsRepository.bulkUpdateStatus(
      ctx,
      listingsToActivate.map((l) => l.id),
      ListingStatus.Active,
    );
  }

  /**
   * Get all listings for an event date (including all statuses).
   * Used for admin operations like date deletion checks.
   */
  async getListingsByDateId(
    ctx: Ctx,
    eventDateId: string,
  ): Promise<TicketListing[]> {
    return await this.ticketsRepository.getAllByEventDateId(ctx, eventDateId);
  }

  /**
   * Cancel all pending/active listings for an event date.
   * Returns the number of cancelled listings and their IDs.
   */
  async cancelListingsByDateId(
    ctx: Ctx,
    eventDateId: string,
  ): Promise<{ cancelledCount: number; listingIds: string[] }> {
    const listings = await this.ticketsRepository.getAllByEventDateId(
      ctx,
      eventDateId,
    );

    const listingsToCancel = listings.filter(
      (l) =>
        l.status === ListingStatus.Active || l.status === ListingStatus.Pending,
    );

    if (listingsToCancel.length === 0) {
      return { cancelledCount: 0, listingIds: [] };
    }

    const listingIds = listingsToCancel.map((l) => l.id);
    const cancelledCount = await this.ticketsRepository.bulkUpdateStatus(
      ctx,
      listingIds,
      ListingStatus.Cancelled,
    );

    return { cancelledCount, listingIds };
  }

  /**
   * Get all listings for an event section (including all statuses).
   * Used for admin operations like section deletion checks.
   */
  async getListingsBySectionId(
    ctx: Ctx,
    eventSectionId: string,
  ): Promise<TicketListing[]> {
    return await this.ticketsRepository.getAllByEventSectionId(
      ctx,
      eventSectionId,
    );
  }

  /**
   * Cancel all pending/active listings for an event section.
   * Returns the number of cancelled listings and their IDs.
   */
  async cancelListingsBySectionId(
    ctx: Ctx,
    eventSectionId: string,
  ): Promise<{ cancelledCount: number; listingIds: string[] }> {
    const listings = await this.ticketsRepository.getAllByEventSectionId(
      ctx,
      eventSectionId,
    );

    const listingsToCancel = listings.filter(
      (l) =>
        l.status === ListingStatus.Active || l.status === ListingStatus.Pending,
    );

    if (listingsToCancel.length === 0) {
      return { cancelledCount: 0, listingIds: [] };
    }

    const listingIds = listingsToCancel.map((l) => l.id);
    const cancelledCount = await this.ticketsRepository.bulkUpdateStatus(
      ctx,
      listingIds,
      ListingStatus.Cancelled,
    );

    return { cancelledCount, listingIds };
  }

  /**
   * Get listing stats (count and available tickets) for multiple event IDs.
   * Used for admin views that need aggregated listing information.
   */
  async getListingStatsByEventIds(
    ctx: Ctx,
    eventIds: string[],
  ): Promise<
    Map<string, { listingsCount: number; availableTicketsCount: number }>
  > {
    return await this.ticketsRepository.getListingStatsByEventIds(
      ctx,
      eventIds,
    );
  }
}
