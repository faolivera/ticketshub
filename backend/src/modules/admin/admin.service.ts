import { Injectable, Inject } from '@nestjs/common';
import { PaymentConfirmationsService } from '../payment-confirmations/payment-confirmations.service';
import { TransactionsService } from '../transactions/transactions.service';
import { EventsService } from '../events/events.service';
import { TicketsRepository } from '../tickets/tickets.repository';
import { TicketsService } from '../tickets/tickets.service';
import { UsersService } from '../users/users.service';
import { ContextLogger } from '../../common/logger/context-logger';
import type { Ctx } from '../../common/types/context';
import type {
  AdminPaymentsResponse,
  AdminPaymentItem,
  AdminPendingEventsResponse,
  AdminPendingEventItem,
  AdminPendingEventDateItem,
  AdminPendingSectionItem,
  AdminUpdateEventRequest,
  AdminUpdateEventResponse,
  AdminAllEventsQuery,
  AdminAllEventsResponse,
  AdminAllEventItem,
  AdminEventListingsResponse,
  AdminEventListingItem,
  Money,
} from './admin.api';
import { EventDateStatus, EventSectionStatus } from '../events/events.domain';

@Injectable()
export class AdminService {
  private readonly logger = new ContextLogger(AdminService.name);

  constructor(
    @Inject(PaymentConfirmationsService)
    private readonly paymentConfirmationsService: PaymentConfirmationsService,
    @Inject(TransactionsService)
    private readonly transactionsService: TransactionsService,
    @Inject(EventsService)
    private readonly eventsService: EventsService,
    @Inject(TicketsRepository)
    private readonly ticketsRepository: TicketsRepository,
    @Inject(TicketsService)
    private readonly ticketsService: TicketsService,
    @Inject(UsersService)
    private readonly usersService: UsersService,
  ) {}

  /**
   * Get enriched payment confirmations for admin payments approval page.
   * Returns pending confirmations with additional transaction details.
   */
  async getAdminPayments(ctx: Ctx): Promise<AdminPaymentsResponse> {
    this.logger.log(ctx, 'Getting admin payments list');

    const pendingConfirmations =
      await this.paymentConfirmationsService.listPendingConfirmations(ctx);

    const enrichedPayments: AdminPaymentItem[] = [];

    for (const confirmation of pendingConfirmations.confirmations) {
      const transaction = await this.transactionsService.findById(
        ctx,
        confirmation.transactionId,
      );

      if (!transaction) {
        this.logger.warn(
          ctx,
          `Transaction ${confirmation.transactionId} not found for confirmation ${confirmation.id}`,
        );
        continue;
      }

      const pricePerUnit: Money = {
        amount: Math.round(
          transaction.ticketPrice.amount / transaction.quantity,
        ),
        currency: transaction.ticketPrice.currency,
      };

      const enrichedPayment: AdminPaymentItem = {
        // Payment confirmation data
        id: confirmation.id,
        transactionId: confirmation.transactionId,
        uploadedBy: confirmation.uploadedBy,
        originalFilename: confirmation.originalFilename,
        contentType: confirmation.contentType,
        status: confirmation.status,
        createdAt: confirmation.createdAt,
        reviewedAt: confirmation.reviewedAt,
        adminNotes: confirmation.adminNotes,

        // Transaction enrichment (already in PaymentConfirmationWithTransaction)
        buyerName: confirmation.buyerName,
        sellerName: confirmation.sellerName,
        eventName: confirmation.eventName,
        transactionAmount: confirmation.transactionAmount,
        transactionCurrency: confirmation.transactionCurrency,

        // Additional transaction details
        listingId: transaction.listingId,
        quantity: transaction.quantity,
        pricePerUnit,
        sellerFee: {
          amount: transaction.sellerFee.amount,
          currency: transaction.sellerFee.currency,
        },
        buyerFee: {
          amount: transaction.buyerFee.amount,
          currency: transaction.buyerFee.currency,
        },
      };

      enrichedPayments.push(enrichedPayment);
    }

    this.logger.log(
      ctx,
      `Found ${enrichedPayments.length} pending payment confirmations`,
    );

    return {
      payments: enrichedPayments,
      total: enrichedPayments.length,
    };
  }

  /**
   * Get pending events and event dates for admin approval page.
   * Returns events that are pending or have pending dates/sections, with listing counts.
   */
  async getPendingEvents(ctx: Ctx): Promise<AdminPendingEventsResponse> {
    this.logger.log(ctx, 'Getting pending events list');

    const pendingEvents = await this.eventsService.getPendingEvents(ctx);
    const allListings = await this.ticketsRepository.getAll(ctx);

    const enrichedEvents: AdminPendingEventItem[] = [];

    for (const event of pendingEvents) {
      const eventListings = allListings.filter((l) => l.eventId === event.id);
      const pendingEventListings = eventListings.filter(
        (l) => l.status === 'Pending',
      );

      const pendingDates: AdminPendingEventDateItem[] = [];

      for (const eventDate of event.dates) {
        if (eventDate.status === EventDateStatus.Pending) {
          const dateListings = pendingEventListings.filter(
            (l) => l.eventDateId === eventDate.id,
          );

          pendingDates.push({
            id: eventDate.id,
            eventId: event.id,
            eventName: event.name,
            date: eventDate.date,
            status: eventDate.status,
            pendingListingsCount: dateListings.length,
            createdAt: eventDate.createdAt,
          });
        }
      }

      const pendingSections: AdminPendingSectionItem[] = [];

      for (const section of event.sections) {
        if (section.status === EventSectionStatus.Pending) {
          const sectionListings = pendingEventListings.filter(
            (l) => l.eventSectionId === section.id,
          );

          pendingSections.push({
            id: section.id,
            eventId: event.id,
            eventName: event.name,
            name: section.name,
            seatingType:
              section.seatingType === 'numbered' ? 'numbered' : 'unnumbered',
            status: section.status,
            pendingListingsCount: sectionListings.length,
            createdAt: section.createdAt,
          });
        }
      }

      enrichedEvents.push({
        id: event.id,
        name: event.name,
        venue: event.venue,
        category: event.category,
        status: event.status,
        createdAt: event.createdAt,
        pendingDates,
        pendingSections,
        pendingListingsCount: pendingEventListings.length,
      });
    }

    this.logger.log(ctx, `Found ${enrichedEvents.length} pending events`);

    return {
      events: enrichedEvents,
      total: enrichedEvents.length,
    };
  }

  /**
   * Update an event and its dates (admin only).
   * Delegates to EventsService for the actual update logic.
   */
  async updateEventWithDates(
    ctx: Ctx,
    eventId: string,
    data: AdminUpdateEventRequest,
    adminId: string,
  ): Promise<AdminUpdateEventResponse> {
    this.logger.log(ctx, `Admin ${adminId} updating event ${eventId}`);

    const result = await this.eventsService.adminUpdateEventWithDates(
      ctx,
      eventId,
      data,
      adminId,
    );

    this.logger.log(
      ctx,
      `Event ${eventId} updated. Deleted ${result.deletedDateIds.length} dates.`,
    );

    return result;
  }

  /**
   * Get all events with pagination and search filter.
   * Returns events with creator info and listing stats.
   */
  async getAllEvents(
    ctx: Ctx,
    query: AdminAllEventsQuery,
  ): Promise<AdminAllEventsResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    this.logger.log(
      ctx,
      `Getting all events - page: ${page}, limit: ${limit}, search: ${query.search || 'none'}`,
    );

    const { events, total } = await this.eventsService.getAllEventsPaginated(
      ctx,
      { page, limit, search: query.search },
    );

    if (events.length === 0) {
      return {
        events: [],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    const creatorIds = [...new Set(events.map((e) => e.createdBy))];
    const creators = await this.usersService.findByIds(ctx, creatorIds);
    const creatorsMap = new Map(creators.map((u) => [u.id, u]));

    const eventIds = events.map((e) => e.id);
    const listingStatsMap = await this.ticketsService.getListingStatsByEventIds(
      ctx,
      eventIds,
    );

    const enrichedEvents: AdminAllEventItem[] = events.map((event) => {
      const creator = creatorsMap.get(event.createdBy);
      const stats = listingStatsMap.get(event.id) || {
        listingsCount: 0,
        availableTicketsCount: 0,
      };

      return {
        id: event.id,
        name: event.name,
        status: event.status,
        createdAt: event.createdAt,
        createdBy: {
          id: event.createdBy,
          publicName: creator?.publicName || 'Unknown User',
        },
        listingsCount: stats.listingsCount,
        availableTicketsCount: stats.availableTicketsCount,
      };
    });

    this.logger.log(ctx, `Found ${total} events, returning page ${page}`);

    return {
      events: enrichedEvents,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get all ticket listings for a specific event.
   * Returns aggregated listing data with seller info, event date, and section.
   */
  async getEventListings(
    ctx: Ctx,
    eventId: string,
  ): Promise<AdminEventListingsResponse> {
    this.logger.log(ctx, `Getting listings for event ${eventId}`);

    const listings = await this.ticketsRepository.getAllByEventId(ctx, eventId);

    if (listings.length === 0) {
      return { listings: [], total: 0 };
    }

    // Collect unique seller IDs
    const sellerIds = [...new Set(listings.map((l) => l.sellerId))];
    const sellers = await this.usersService.findByIds(ctx, sellerIds);
    const sellersMap = new Map(sellers.map((u) => [u.id, u]));

    // Get event with dates and sections
    const eventWithDates = await this.eventsService.getEventById(ctx, eventId);
    const datesMap = new Map(eventWithDates.dates.map((d) => [d.id, d]));
    const sectionsMap = new Map(eventWithDates.sections.map((s) => [s.id, s]));

    // Build response
    const enrichedListings: AdminEventListingItem[] = listings.map((listing) => {
      const seller = sellersMap.get(listing.sellerId);
      const eventDate = datesMap.get(listing.eventDateId);
      const eventSection = sectionsMap.get(listing.eventSectionId);

      const ticketsByStatus = {
        available: listing.ticketUnits.filter((u) => u.status === 'available')
          .length,
        reserved: listing.ticketUnits.filter((u) => u.status === 'reserved')
          .length,
        sold: listing.ticketUnits.filter((u) => u.status === 'sold').length,
      };

      return {
        id: listing.id,
        createdBy: {
          id: listing.sellerId,
          publicName: seller?.publicName || 'Unknown User',
        },
        eventDate: {
          id: listing.eventDateId,
          date: eventDate?.date || new Date(),
        },
        eventSection: {
          id: listing.eventSectionId,
          name: eventSection?.name || 'Unknown Section',
        },
        totalTickets: listing.ticketUnits.length,
        ticketsByStatus,
        status: listing.status,
        pricePerTicket: {
          amount: listing.pricePerTicket.amount,
          currency: listing.pricePerTicket.currency,
        },
        createdAt: listing.createdAt,
      };
    });

    this.logger.log(
      ctx,
      `Found ${enrichedListings.length} listings for event ${eventId}`,
    );

    return {
      listings: enrichedListings,
      total: enrichedListings.length,
    };
  }
}
