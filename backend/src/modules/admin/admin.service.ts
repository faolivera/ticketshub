import { Injectable, Inject } from '@nestjs/common';
import { PaymentConfirmationsService } from '../payment-confirmations/payment-confirmations.service';
import { TransactionsService } from '../transactions/transactions.service';
import { EventsService } from '../events/events.service';
import { TicketsRepository } from '../tickets/tickets.repository';
import { ContextLogger } from '../../common/logger/context-logger';
import type { Ctx } from '../../common/types/context';
import type {
  AdminPaymentsResponse,
  AdminPaymentItem,
  AdminPendingEventsResponse,
  AdminPendingEventItem,
  AdminPendingEventDateItem,
  AdminUpdateEventRequest,
  AdminUpdateEventResponse,
  Money,
} from './admin.api';
import { EventStatus, EventDateStatus } from '../events/events.domain';

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
        amount: Math.round(transaction.ticketPrice.amount / transaction.quantity),
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
   * Returns events that are pending or have pending dates, with listing counts.
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
            startTime: eventDate.startTime,
            status: eventDate.status,
            pendingListingsCount: dateListings.length,
            createdAt: eventDate.createdAt,
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
}
