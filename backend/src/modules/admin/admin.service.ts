import { Injectable, Inject, NotFoundException } from '@nestjs/common';
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
  AdminTransactionsQuery,
  AdminTransactionsResponse,
  AdminTransactionListItem,
  AdminTransactionsPendingSummaryResponse,
  AdminTransactionDetailResponse,
  AdminTransactionUserRef,
  AdminTransactionListingRef,
  AdminTransactionPaymentConfirmationRef,
  Money,
} from './admin.api';
import { EventDateStatus, EventSectionStatus } from '../events/events.domain';
import type { Transaction } from '../transactions/transactions.domain';
import { TransactionStatus } from '../transactions/transactions.domain';

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

  /**
   * Get paginated transactions list for admin.
   * Search supports transaction id, buyer email, seller email.
   */
  async getTransactionsList(
    ctx: Ctx,
    query: AdminTransactionsQuery,
  ): Promise<AdminTransactionsResponse> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 20);

    this.logger.log(
      ctx,
      `Getting transactions - page: ${page}, limit: ${limit}, search: ${query.search || 'none'}`,
    );

    const filters = await this.resolveTransactionSearchFilters(ctx, query.search);

    const { transactions, total } =
      await this.transactionsService.getPaginated(ctx, page, limit, filters);

    if (transactions.length === 0) {
      return {
        transactions: [],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    const enriched = await this.enrichTransactionsForList(
      ctx,
      transactions,
    );

    this.logger.log(
      ctx,
      `Found ${total} transactions, returning page ${page}`,
    );

    return {
      transactions: enriched,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get pending payment confirmations summary.
   */
  async getTransactionsPendingSummary(
    ctx: Ctx,
  ): Promise<AdminTransactionsPendingSummaryResponse> {
    const [pendingConfirmationsCount, pendingTransactionsCount] =
      await Promise.all([
        this.paymentConfirmationsService.getPendingCount(ctx),
        this.transactionsService.countByStatuses(ctx, [
          TransactionStatus.PendingPayment,
        ]),
      ]);

    return { pendingConfirmationsCount, pendingTransactionsCount };
  }

  /**
   * Get transaction detail by ID.
   */
  async getTransactionById(
    ctx: Ctx,
    id: string,
  ): Promise<AdminTransactionDetailResponse> {
    const transaction = await this.transactionsService.findById(ctx, id);
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const [buyers, sellers] = await Promise.all([
      this.usersService.findByIds(ctx, [transaction.buyerId]),
      this.usersService.findByIds(ctx, [transaction.sellerId]),
    ]);
    const buyer = buyers[0];
    const seller = sellers[0];

    const listing = await this.ticketsService.getListingById(
      ctx,
      transaction.listingId,
    );

    const confirmations =
      await this.paymentConfirmationsService.findByTransactionIds(ctx, [
        transaction.id,
      ]);
    const paymentConfirmations = confirmations.map((confirmation) => ({
      id: confirmation.id,
      transactionId: confirmation.transactionId,
      status: confirmation.status,
      originalFilename: confirmation.originalFilename,
      createdAt: confirmation.createdAt,
      reviewedAt: confirmation.reviewedAt,
      adminNotes: confirmation.adminNotes,
      uploadedBy: confirmation.uploadedBy,
      contentType: confirmation.contentType,
    }));

    const sellerRef: AdminTransactionUserRef = {
      id: transaction.sellerId,
      name: seller?.publicName ?? 'Unknown',
      email: seller?.email ?? '',
    };
    const buyerRef: AdminTransactionUserRef = {
      id: transaction.buyerId,
      name: buyer?.publicName ?? 'Unknown',
      email: buyer?.email ?? '',
    };
    const listingRef: AdminTransactionListingRef = {
      id: listing.id,
      eventName: listing.eventName,
      eventDate: listing.eventDate,
      sectionName: listing.sectionName,
      quantity: transaction.quantity,
      pricePerTicket: listing.pricePerTicket,
    };

    return {
      id: transaction.id,
      seller: sellerRef,
      buyer: buyerRef,
      status: transaction.status,
      listing: listingRef,
      quantity: transaction.quantity,
      ticketPrice: transaction.ticketPrice,
      buyerFee: transaction.buyerFee,
      sellerFee: transaction.sellerFee,
      totalPaid: transaction.totalPaid,
      sellerReceives: transaction.sellerReceives,
      createdAt: transaction.createdAt,
      paymentReceivedAt: transaction.paymentReceivedAt,
      ticketTransferredAt: transaction.ticketTransferredAt,
      buyerConfirmedAt: transaction.buyerConfirmedAt,
      completedAt: transaction.completedAt,
      paymentConfirmations,
    };
  }

  private async resolveTransactionSearchFilters(
    ctx: Ctx,
    search?: string,
  ): Promise<
    | {
        transactionId?: string;
        buyerIds?: string[];
        sellerIds?: string[];
      }
    | undefined
  > {
    if (!search?.trim()) return undefined;

    const term = search.trim();

    const filters: {
      transactionId?: string;
      buyerIds?: string[];
      sellerIds?: string[];
    } = {};

    // Always try exact transaction-id matching as part of search.
    filters.transactionId = term;

    const usersByEmail =
      await this.usersService.findByEmailContaining(ctx, term);
    if (usersByEmail.length > 0) {
      const userIds = usersByEmail.map((u) => u.id);
      filters.buyerIds = userIds;
      filters.sellerIds = userIds;
    }

    if (!filters.buyerIds && !filters.sellerIds && !filters.transactionId) {
      return { transactionId: '__no_match__' };
    }

    const hasEmailMatches =
      (filters.buyerIds?.length ?? 0) > 0 || (filters.sellerIds?.length ?? 0) > 0;
    const hasTransactionId = Boolean(filters.transactionId);
    if (!hasEmailMatches && hasTransactionId && !term.startsWith('txn_')) {
      // For non transaction-id text (e.g. random keyword) with no email matches,
      // avoid returning all rows by forcing a no-match filter.
      return { transactionId: '__no_match__' };
    }

    return filters;
  }

  private async enrichTransactionsForList(
    ctx: Ctx,
    transactions: Transaction[],
  ): Promise<AdminTransactionListItem[]> {
    const buyerIds = [...new Set(transactions.map((t) => t.buyerId))];
    const sellerIds = [...new Set(transactions.map((t) => t.sellerId))];
    const listingIds = [...new Set(transactions.map((t) => t.listingId))];
    const transactionIds = transactions.map((t) => t.id);

    const [users, listings, confirmations] = await Promise.all([
      this.usersService.findByIds(ctx, [...buyerIds, ...sellerIds]),
      this.ticketsService.getListingsByIds(ctx, listingIds),
      this.paymentConfirmationsService.findByTransactionIds(ctx, transactionIds),
    ]);

    const usersMap = new Map(users.map((u) => [u.id, u]));
    const listingsMap = new Map(listings.map((l) => [l.id, l]));
    const confirmationsByTxn = new Map(
      confirmations.map((c) => [c.transactionId, c]),
    );

    return transactions.map((t) => {
      const buyer = usersMap.get(t.buyerId);
      const seller = usersMap.get(t.sellerId);
      const listing = listingsMap.get(t.listingId);
      const confirmation = confirmationsByTxn.get(t.id);

      const sellerRef: AdminTransactionUserRef = {
        id: t.sellerId,
        name: seller?.publicName ?? 'Unknown',
        email: seller?.email ?? '',
      };
      const buyerRef: AdminTransactionUserRef = {
        id: t.buyerId,
        name: buyer?.publicName ?? 'Unknown',
        email: buyer?.email ?? '',
      };
      const listingRef: AdminTransactionListingRef = {
        id: t.listingId,
        eventName: listing?.eventName ?? 'Unknown Event',
        eventDate: listing?.eventDate ?? new Date(),
        sectionName: listing?.sectionName ?? 'Unknown',
        quantity: t.quantity,
        pricePerTicket: listing?.pricePerTicket ?? {
          amount: 0,
          currency: 'USD',
        },
      };

      const paymentConfirmation: AdminTransactionPaymentConfirmationRef | undefined =
        confirmation
          ? {
              id: confirmation.id,
              status: confirmation.status,
              originalFilename: confirmation.originalFilename,
              createdAt: confirmation.createdAt,
              reviewedAt: confirmation.reviewedAt,
              adminNotes: confirmation.adminNotes,
            }
          : undefined;

      return {
        id: t.id,
        seller: sellerRef,
        buyer: buyerRef,
        status: t.status,
        listing: listingRef,
        totalPaid: t.totalPaid,
        createdAt: t.createdAt,
        paymentConfirmation,
      };
    });
  }
}
