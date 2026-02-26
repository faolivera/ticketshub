import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  forwardRef,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { TicketsRepository } from './tickets.repository';
import { EventsService } from '../events/events.service';
import type { Ctx } from '../../common/types/context';
import type {
  TicketListing,
  TicketListingWithEvent,
  TicketUnit,
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
import { UserLevel } from '../users/users.domain';
import { EventStatus, EventDateStatus } from '../events/events.domain';

@Injectable()
export class TicketsService {
  constructor(
    @Inject(TicketsRepository)
    private readonly ticketsRepository: TicketsRepository,
    @Inject(forwardRef(() => EventsService))
    private readonly eventsService: EventsService,
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

  private validateListingSeatingConsistency(listing: TicketListing): void {
    const hasSeatUnits = listing.ticketUnits.some((unit) => unit.seat);
    const hasSeatlessUnits = listing.ticketUnits.some((unit) => !unit.seat);

    if (hasSeatUnits && hasSeatlessUnits) {
      throw new BadRequestException('Listing ticket units must be homogeneous');
    }

    if (listing.seatingType === SeatingType.Numbered && hasSeatlessUnits) {
      throw new BadRequestException(
        'Numbered listings require seat information for all units',
      );
    }

    if (listing.seatingType === SeatingType.Unnumbered && hasSeatUnits) {
      throw new BadRequestException(
        'Unnumbered listings cannot contain seat information',
      );
    }
  }

  private buildTicketUnits(data: CreateListingRequest): TicketUnit[] {
    const hasQuantity = data.quantity !== undefined;
    const hasTicketUnits =
      Array.isArray(data.ticketUnits) && data.ticketUnits.length > 0;

    if (hasQuantity === hasTicketUnits) {
      throw new BadRequestException('Provide either quantity or ticketUnits');
    }

    if (hasQuantity) {
      if (data.seatingType !== SeatingType.Unnumbered) {
        throw new BadRequestException(
          'Quantity can only be used for unnumbered listings',
        );
      }
      if (!data.quantity || data.quantity < 1) {
        throw new BadRequestException('Quantity must be at least 1');
      }
      return Array.from({ length: data.quantity }, () => ({
        id: this.generateUnitId(),
        status: TicketUnitStatus.Available,
      }));
    }

    const incomingUnits = (
      data.ticketUnits as CreateListingTicketUnitInput[]
    ).map((unit) => ({
      id: this.generateUnitId(),
      status: TicketUnitStatus.Available,
      seat: unit.seat,
    }));

    const hasNumbered = incomingUnits.some((unit) => unit.seat);
    const hasUnnumbered = incomingUnits.some((unit) => !unit.seat);
    if (hasNumbered && hasUnnumbered) {
      throw new BadRequestException(
        'All ticket units must be either numbered or unnumbered',
      );
    }

    if (hasNumbered) {
      if (data.seatingType !== SeatingType.Numbered) {
        throw new BadRequestException(
          'Numbered ticket units require seatingType=numbered',
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
    } else if (data.seatingType !== SeatingType.Unnumbered) {
      throw new BadRequestException(
        'Unnumbered ticket units require seatingType=unnumbered',
      );
    }

    return incomingUnits;
  }

  /**
   * Determine listing status based on event and event date approval status
   */
  private determineListingStatus(
    eventStatus: EventStatus,
    eventDateStatus: EventDateStatus,
  ): ListingStatus {
    const eventApproved = eventStatus === EventStatus.Approved;
    const dateApproved = eventDateStatus === EventDateStatus.Approved;

    if (eventApproved && dateApproved) {
      return ListingStatus.Active;
    }

    return ListingStatus.Pending;
  }

  /**
   * Create a new listing
   */
  async createListing(
    ctx: Ctx,
    sellerId: string,
    userLevel: UserLevel,
    data: CreateListingRequest,
  ): Promise<TicketListing> {
    // Check permissions
    if (
      userLevel !== UserLevel.Seller &&
      userLevel !== UserLevel.VerifiedSeller
    ) {
      throw new ForbiddenException('Only sellers can create listings');
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

    const ticketUnits = this.buildTicketUnits(data);

    // Determine listing status based on event and date approval
    const listingStatus = this.determineListingStatus(
      event.status,
      eventDate.status,
    );

    const listing: TicketListing = {
      id: this.generateId(),
      sellerId,
      eventId: data.eventId,
      eventDateId: data.eventDateId,
      type: data.type,
      seatingType: data.seatingType,
      ticketUnits,
      sellTogether: data.sellTogether || false,
      pricePerTicket: data.pricePerTicket,
      deliveryMethod: data.deliveryMethod,
      pickupAddress: data.pickupAddress,
      description: data.description,
      section: data.section,
      status: listingStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.validateListingSeatingConsistency(listing);

    return await this.ticketsRepository.create(ctx, listing);
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
   * Enrich listing with event information
   */
  private async enrichListingWithEvent(
    ctx: Ctx,
    listing: TicketListing,
  ): Promise<TicketListingWithEvent> {
    const event = await this.eventsService.getEventById(ctx, listing.eventId);
    const eventDate = event.dates.find((d) => d.id === listing.eventDateId);

    return {
      ...listing,
      eventName: event.name,
      eventDate: eventDate?.date || new Date(),
      venue: event.venue,
    };
  }

  /**
   * List listings with optional filters
   */
  async listListings(
    ctx: Ctx,
    query: ListListingsQuery,
  ): Promise<TicketListingWithEvent[]> {
    let listings: TicketListing[];

    if (query.eventDateId) {
      listings = await this.ticketsRepository.getByEventDateId(
        ctx,
        query.eventDateId,
      );
    } else if (query.eventId) {
      listings = await this.ticketsRepository.getByEventId(ctx, query.eventId);
    } else if (query.sellerId) {
      listings = await this.ticketsRepository.getBySellerId(
        ctx,
        query.sellerId,
      );
    } else {
      listings = await this.ticketsRepository.getActiveListings(ctx);
    }

    // Apply filters
    if (query.type) {
      listings = listings.filter((l) => l.type === query.type);
    }

    if (query.minPrice !== undefined) {
      listings = listings.filter(
        (l) => l.pricePerTicket.amount >= query.minPrice!,
      );
    }

    if (query.maxPrice !== undefined) {
      listings = listings.filter(
        (l) => l.pricePerTicket.amount <= query.maxPrice!,
      );
    }

    // Pagination
    const offset = query.offset || 0;
    const limit = query.limit || 20;
    listings = listings.slice(offset, offset + limit);

    // Enrich with event info
    return await Promise.all(
      listings.map((l) => this.enrichListingWithEvent(ctx, l)),
    );
  }

  /**
   * Update a listing
   */
  async updateListing(
    ctx: Ctx,
    listingId: string,
    sellerId: string,
    updates: UpdateListingRequest,
  ): Promise<TicketListing> {
    const listing = await this.ticketsRepository.findById(ctx, listingId);
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.sellerId !== sellerId) {
      throw new ForbiddenException('You can only update your own listings');
    }

    if (listing.status !== ListingStatus.Active) {
      throw new BadRequestException('Can only update active listings');
    }

    if (updates.seatingType && updates.seatingType !== listing.seatingType) {
      const hasReservedOrSold = listing.ticketUnits.some(
        (unit) => unit.status !== TicketUnitStatus.Available,
      );
      if (hasReservedOrSold) {
        throw new BadRequestException(
          'Cannot change seating type when units are already reserved or sold',
        );
      }

      const hasSeatUnits = listing.ticketUnits.some((unit) => unit.seat);
      if (updates.seatingType === SeatingType.Numbered && !hasSeatUnits) {
        throw new BadRequestException(
          'Cannot switch to numbered without seat information',
        );
      }
      if (updates.seatingType === SeatingType.Unnumbered && hasSeatUnits) {
        throw new BadRequestException(
          'Cannot switch to unnumbered while seat information exists',
        );
      }
    }

    const updated = await this.ticketsRepository.update(
      ctx,
      listingId,
      updates,
    );
    if (!updated) {
      throw new NotFoundException('Listing not found');
    }

    return updated;
  }

  /**
   * Cancel a listing
   */
  async cancelListing(
    ctx: Ctx,
    listingId: string,
    sellerId: string,
  ): Promise<TicketListing> {
    const listing = await this.ticketsRepository.findById(ctx, listingId);
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.sellerId !== sellerId) {
      throw new ForbiddenException('You can only cancel your own listings');
    }

    if (listing.status !== ListingStatus.Active) {
      throw new BadRequestException('Can only cancel active listings');
    }

    const updated = await this.ticketsRepository.update(ctx, listingId, {
      status: ListingStatus.Cancelled,
    });
    if (!updated) {
      throw new NotFoundException('Listing not found');
    }

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
    return await Promise.all(
      listings.map((l) => this.enrichListingWithEvent(ctx, l)),
    );
  }

  /**
   * Reserve tickets for purchase (internal use by Transactions)
   */
  async reserveTickets(
    ctx: Ctx,
    listingId: string,
    ticketUnitIds: string[],
  ): Promise<TicketListing> {
    const listing = await this.ticketsRepository.findById(ctx, listingId);
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.status !== ListingStatus.Active) {
      throw new BadRequestException('Listing is not available');
    }

    this.validateListingSeatingConsistency(listing);

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

    const updated = await this.ticketsRepository.reserveUnits(
      ctx,
      listingId,
      ticketUnitIds,
    );
    if (!updated) {
      throw new BadRequestException('Unable to reserve selected ticket units');
    }

    return updated;
  }

  /**
   * Restore tickets (when transaction is cancelled)
   */
  async restoreTickets(
    ctx: Ctx,
    listingId: string,
    ticketUnitIds: string[],
  ): Promise<TicketListing | undefined> {
    return await this.ticketsRepository.restoreUnits(
      ctx,
      listingId,
      ticketUnitIds,
    );
  }

  /**
   * Activate pending listings for an event.
   * Called when an event is approved.
   * Only activates listings whose event date is also approved.
   */
  async activatePendingListingsForEvent(
    ctx: Ctx,
    eventId: string,
  ): Promise<number> {
    const event = await this.eventsService.getEventById(ctx, eventId);
    if (!event || event.status !== EventStatus.Approved) {
      return 0;
    }

    const pendingListings =
      await this.ticketsRepository.getPendingByEventId(ctx, eventId);

    const approvedDateIds = new Set(
      event.dates
        .filter((d) => d.status === EventDateStatus.Approved)
        .map((d) => d.id),
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
   * Activate pending listings for an event date.
   * Called when an event date is approved.
   * Only activates if the parent event is also approved.
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

    const pendingListings =
      await this.ticketsRepository.getPendingByEventDateId(ctx, eventDateId);

    if (pendingListings.length === 0) {
      return 0;
    }

    return await this.ticketsRepository.bulkUpdateStatus(
      ctx,
      pendingListings.map((l) => l.id),
      ListingStatus.Active,
    );
  }
}
