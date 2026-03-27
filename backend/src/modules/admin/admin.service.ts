import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PaymentConfirmationsService } from '../payment-confirmations/payment-confirmations.service';
import {
  PRIVATE_STORAGE_PROVIDER,
  type FileStorageProvider,
} from '../../common/storage/file-storage-provider.interface';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaymentMethodsService } from '../payments/payment-methods.service';
import { TransactionsService } from '../transactions/transactions.service';
import { EventsService } from '../events/events.service';
import { EventScoringService } from '../event-scoring/event-scoring.service';
import {
  TICKETS_REPOSITORY,
  type ITicketsRepository,
} from '../tickets/tickets.repository.interface';
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
  AdminTransactionAuditLogsResponse,
  AdminTransactionDetailResponse,
  AdminUpdateTransactionRequest,
  AdminTransactionUserRef,
  AdminTransactionListingRef,
  AdminTransactionPaymentConfirmationRef,
  Money,
  AdminUserSearchResponse,
  AdminSellerPayoutsResponse,
  AdminSellerPayoutItem,
  AdminCompletePayoutResponse,
  AdminSupportTicketsQuery,
  AdminSupportTicketsResponse,
  AdminSupportTicketItem,
  AdminSupportTicketDetailResponse,
  AdminSupportTicketTransactionSummary,
  AdminUpdateSupportTicketStatusResponse,
  AdminResolveSupportDisputeResponse,
  AdminAddSupportTicketMessageResponse,
  AdminDashboardMetricsResponse,
  AdminUsersQuery,
  AdminUsersResponse,
  AdminUserListItem,
  AdminUserDetailResponse,
  AdminUpdateUserRequest,
  ImportEventsPayload,
  ImportEventsPreviewResponse,
  ImportEventsPreviewItem,
  ImportEventsValidationErrorResponse,
  ImportEventValidationError,
  ImportEventsResultResponse,
  ImportEventResultItem,
  ImportEventItem,
  AdminTransactionChatMessagesResponse,
} from './admin.api';
import {
  EventDateStatus,
  EventSectionStatus,
  generateEventSlug,
} from '../events/events.domain';
import { ImportEventsPayloadSchema } from './schemas/api.schemas';
import { z } from 'zod';
import type { CreateEventRequest } from '../events/events.api';
import type { EventBannerType, EventCategory } from '../events/events.domain';
import type { SeatingType } from '../tickets/tickets.domain';
import {
  IdentityVerificationStatus,
  Language,
  Role,
} from '../users/users.domain';
import type { User } from '../users/users.domain';
import type { Transaction } from '../transactions/transactions.domain';
import {
  TransactionStatus,
  RequiredActor,
  CancellationReason,
} from '../transactions/transactions.domain';
import { SupportService } from '../support/support.service';
import {
  SupportTicketStatus,
  DisputeResolution,
} from '../support/support.domain';
import { TransactionChatService } from '../transaction-chat/transaction-chat.service';
import type { SupportTicket, SupportMessage } from '../support/support.domain';
import { CACHE_SERVICE, type ICacheService } from '../../common/cache';

@Injectable()
export class AdminService {
  private readonly logger = new ContextLogger(AdminService.name);

  constructor(
    @Inject(PaymentConfirmationsService)
    private readonly paymentConfirmationsService: PaymentConfirmationsService,
    @Inject(PaymentMethodsService)
    private readonly paymentMethodsService: PaymentMethodsService,
    @Inject(TransactionsService)
    private readonly transactionsService: TransactionsService,
    @Inject(EventsService)
    private readonly eventsService: EventsService,
    @Inject(TICKETS_REPOSITORY)
    private readonly ticketsRepository: ITicketsRepository,
    @Inject(TicketsService)
    private readonly ticketsService: TicketsService,
    @Inject(UsersService)
    private readonly usersService: UsersService,
    @Inject(PRIVATE_STORAGE_PROVIDER)
    private readonly privateStorage: FileStorageProvider,
    private readonly prisma: PrismaService,
    @Inject(SupportService)
    private readonly supportService: SupportService,
    @Inject(EventScoringService)
    private readonly eventScoringService: EventScoringService,
    @Inject(CACHE_SERVICE)
    private readonly cache: ICacheService,
    @Inject(TransactionChatService)
    private readonly transactionChatService: TransactionChatService,
  ) {}

  async clearCache(ctx: Ctx): Promise<void> {
    this.cache.clear();
    this.logger.log(ctx, 'Cache cleared by admin');
  }

  private static readonly USER_SEARCH_LIMIT = 20;

  /** Allowed MIME types for payout receipt uploads (images and PDF) */
  private static readonly PAYOUT_RECEIPT_MIME_TYPES = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'application/pdf',
  ] as const;

  private static readonly PAYOUT_RECEIPT_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

  /**
   * Search users by email (contains, case-insensitive) for admin autocomplete.
   * Returns at most USER_SEARCH_LIMIT results with id and email only.
   */
  async searchUsersByEmail(
    ctx: Ctx,
    searchTerm: string,
  ): Promise<AdminUserSearchResponse> {
    const term = searchTerm?.trim() ?? '';
    if (term.length < 2) return [];
    const users = await this.usersService.findByEmailContaining(ctx, term, AdminService.USER_SEARCH_LIMIT);
    return users.map((u) => ({
      id: u.id,
      email: u.email,
    }));
  }

  /**
   * Get dashboard metrics with minimal DB load (single raw query with counts).
   */
  async getDashboardMetrics(ctx: Ctx): Promise<AdminDashboardMetricsResponse> {
    void ctx;
    type Row = {
      users_total: bigint;
      users_phone_verified: bigint;
      users_dni_verified: bigint;
      users_sellers: bigint;
      users_verified_sellers: bigint;
      events_published: bigint;
      events_active: bigint;
      events_today: bigint;
      events_awaiting_approval: bigint;
      st_open: bigint;
      st_in_progress: bigint;
      st_resolved: bigint;
      st_total: bigint;
      pending_identity: bigint;
      pending_bank: bigint;
      pending_events: bigint;
      pending_buyer_payments: bigint;
      pending_seller_payouts: bigint;
    };
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT
        (SELECT COUNT(*)::bigint FROM users) AS users_total,
        (SELECT COUNT(*)::bigint FROM users WHERE "phoneVerified" = true) AS users_phone_verified,
        (SELECT COUNT(*)::bigint FROM users WHERE "identityVerification" IS NOT NULL AND ("identityVerification"::jsonb->>'status') = 'approved') AS users_dni_verified,
        (SELECT COUNT(*)::bigint FROM users WHERE "acceptedSellerTermsAt" IS NOT NULL) AS users_sellers,
        (SELECT COUNT(*)::bigint FROM users WHERE "emailVerified" = true AND "phoneVerified" = true AND "identityVerification" IS NOT NULL AND ("identityVerification"::jsonb->>'status') = 'approved' AND "bankAccount" IS NOT NULL AND ("bankAccount"::jsonb->>'verified') = 'true') AS users_verified_sellers,
        (SELECT COUNT(*)::bigint FROM events WHERE status = 'approved') AS events_published,
        (SELECT COUNT(*)::bigint FROM events e WHERE e.status = 'approved' AND EXISTS (SELECT 1 FROM event_dates ed WHERE ed."eventId" = e.id AND ed.date >= ${now} AND ed.status = 'approved')) AS events_active,
        (SELECT COUNT(*)::bigint FROM event_dates WHERE date >= ${todayStart} AND date < ${todayEnd} AND status = 'approved') AS events_today,
        (SELECT COUNT(*)::bigint FROM events WHERE status = 'pending') AS events_awaiting_approval,
        (SELECT COUNT(*)::bigint FROM support_tickets WHERE status = 'open') AS st_open,
        (SELECT COUNT(*)::bigint FROM support_tickets WHERE status = 'in_progress') AS st_in_progress,
        (SELECT COUNT(*)::bigint FROM support_tickets WHERE status IN ('resolved', 'closed')) AS st_resolved,
        (SELECT COUNT(*)::bigint FROM support_tickets) AS st_total,
        (SELECT COUNT(*)::bigint FROM identity_verification_requests WHERE status = 'pending') AS pending_identity,
        (SELECT COUNT(*)::bigint FROM users WHERE "bankAccount" IS NOT NULL AND (("bankAccount"::jsonb->>'verified') IS NULL OR ("bankAccount"::jsonb->>'verified') = 'false')) AS pending_bank,
        (SELECT COUNT(*)::bigint FROM events WHERE status = 'pending') + (SELECT COUNT(*)::bigint FROM event_dates WHERE status = 'pending') + (SELECT COUNT(*)::bigint FROM event_sections WHERE status = 'pending') AS pending_events,
        (SELECT COUNT(*)::bigint FROM payment_confirmations WHERE status = 'pending') AS pending_buyer_payments,
        (SELECT COUNT(*)::bigint FROM transactions WHERE status = 'TransferringFund') AS pending_seller_payouts
    `;
    const r = rows[0];
    const toNum = (x: bigint | undefined): number =>
      x != null ? Number(x) : 0;
    return {
      users: {
        total: toNum(r?.users_total),
        phoneVerified: toNum(r?.users_phone_verified),
        dniVerified: toNum(r?.users_dni_verified),
        sellers: toNum(r?.users_sellers),
        verifiedSellers: toNum(r?.users_verified_sellers),
      },
      events: {
        totalPublished: toNum(r?.events_published),
        totalActive: toNum(r?.events_active),
        eventsToday: toNum(r?.events_today),
        awaitingApproval: toNum(r?.events_awaiting_approval),
      },
      supportTickets: {
        totalOpen: toNum(r?.st_open),
        totalInProgress: toNum(r?.st_in_progress),
        totalResolved: toNum(r?.st_resolved),
        total: toNum(r?.st_total),
      },
      pending: {
        identityVerifications: toNum(r?.pending_identity),
        bankAccounts: toNum(r?.pending_bank),
        eventsAwaitingApproval: toNum(r?.pending_events),
        buyerPaymentsPending: toNum(r?.pending_buyer_payments),
        sellerPayoutsPending: toNum(r?.pending_seller_payouts),
      },
    };
  }

  /**
   * Get paginated admin user list with optional search.
   */
  async getUsersList(
    ctx: Ctx,
    params: AdminUsersQuery,
  ): Promise<AdminUsersResponse> {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const { users, total } = await this.usersService.getListForAdmin(ctx, {
      page,
      limit,
      search: params.search,
    });
    const totalPages = Math.ceil(total / limit);
    const list: AdminUserListItem[] = users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      status: u.status,
      role: u.role,
      emailVerified: u.emailVerified,
      phoneVerified: u.phoneVerified,
      identityVerificationStatus: this.identityStatusForAdmin(u),
      bankAccountVerified: !!u.bankAccount?.verified,
      acceptedSellerTermsAt: u.acceptedSellerTermsAt,
      createdAt: u.createdAt,
    }));
    return {
      users: list,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get full user detail for admin view/edit.
   */
  async getUserById(
    ctx: Ctx,
    userId: string,
  ): Promise<AdminUserDetailResponse> {
    const user = await this.usersService.findById(ctx, userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toAdminUserDetail(user);
  }

  /**
   * Update user by admin (allowed fields only).
   */
  async updateUser(
    ctx: Ctx,
    userId: string,
    data: AdminUpdateUserRequest,
  ): Promise<AdminUserDetailResponse> {
    const allowed: Parameters<UsersService['updateByAdmin']>[2] = {};
    if (data.firstName !== undefined) allowed.firstName = data.firstName;
    if (data.lastName !== undefined) allowed.lastName = data.lastName;
    if (data.publicName !== undefined) allowed.publicName = data.publicName;
    if (data.email !== undefined) allowed.email = data.email;
    if (data.role !== undefined) allowed.role = data.role as Role;
    if (data.status !== undefined)
      allowed.status = data.status as User['status'];
    if (data.phone !== undefined) allowed.phone = data.phone;
    if (data.emailVerified !== undefined)
      allowed.emailVerified = data.emailVerified;
    if (data.phoneVerified !== undefined)
      allowed.phoneVerified = data.phoneVerified;
    if (data.country !== undefined) allowed.country = data.country;
    if (data.currency !== undefined)
      allowed.currency = data.currency as User['currency'];
    if (data.language !== undefined)
      allowed.language = data.language === 'es' ? Language.ES : Language.EN;
    if (data.tosAcceptedAt !== undefined)
      allowed.tosAcceptedAt =
        data.tosAcceptedAt == null
          ? null
          : typeof data.tosAcceptedAt === 'string'
            ? new Date(data.tosAcceptedAt)
            : data.tosAcceptedAt;
    if (data.acceptedSellerTermsAt !== undefined)
      allowed.acceptedSellerTermsAt =
        data.acceptedSellerTermsAt == null
          ? null
          : typeof data.acceptedSellerTermsAt === 'string'
            ? new Date(data.acceptedSellerTermsAt)
            : data.acceptedSellerTermsAt;
    if (data.buyerDisputed !== undefined)
      allowed.buyerDisputed = data.buyerDisputed;
    if (data.identityVerification !== undefined) {
      allowed.identityVerification = {
        status: data.identityVerification.status as
          | IdentityVerificationStatus
          | undefined,
        rejectionReason: data.identityVerification.rejectionReason,
        reviewedAt:
          data.identityVerification.reviewedAt != null
            ? typeof data.identityVerification.reviewedAt === 'string'
              ? new Date(data.identityVerification.reviewedAt)
              : data.identityVerification.reviewedAt
            : undefined,
      };
    }
    if (data.bankAccount !== undefined) {
      allowed.bankAccount = {
        ...data.bankAccount,
        verifiedAt:
          data.bankAccount.verifiedAt != null
            ? typeof data.bankAccount.verifiedAt === 'string'
              ? new Date(data.bankAccount.verifiedAt)
              : data.bankAccount.verifiedAt
            : undefined,
      };
    }
    const updated = await this.usersService.updateByAdmin(ctx, userId, allowed);
    return this.toAdminUserDetail(updated);
  }

  private identityStatusForAdmin(u: {
    identityVerification?: { status: string };
  }): 'none' | 'pending' | 'approved' | 'rejected' {
    if (!u.identityVerification) return 'none';
    const s = u.identityVerification.status;
    if (s === 'approved') return 'approved';
    if (s === 'rejected') return 'rejected';
    return 'pending';
  }

  private toAdminUserDetail(user: User): AdminUserDetailResponse {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      publicName: user.publicName,
      role: user.role,
      status: user.status,
      phone: user.phone,
      country: user.country,
      currency: user.currency,
      language: user.language,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      tosAcceptedAt: user.tosAcceptedAt,
      acceptedSellerTermsAt: user.acceptedSellerTermsAt,
      identityVerification: user.identityVerification
        ? {
            status: user.identityVerification.status,
            legalFirstName: user.identityVerification.legalFirstName,
            legalLastName: user.identityVerification.legalLastName,
            dateOfBirth: user.identityVerification.dateOfBirth,
            governmentIdNumber: user.identityVerification.governmentIdNumber,
            submittedAt: user.identityVerification.submittedAt,
            reviewedAt: user.identityVerification.reviewedAt,
            rejectionReason: user.identityVerification.rejectionReason,
          }
        : undefined,
      bankAccount: user.bankAccount
        ? {
            holderName: user.bankAccount.holderName,
            cbuOrCvu: user.bankAccount.cbuOrCvu,
            verified: user.bankAccount.verified,
            verifiedAt: user.bankAccount.verifiedAt,
          }
        : undefined,
      buyerDisputed: user.buyerDisputed,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Get enriched payment confirmations for admin payments approval page.
   * Returns pending confirmations with additional transaction details.
   * Uses a single batch query for transactions to avoid N+1.
   */
  async getAdminPayments(ctx: Ctx): Promise<AdminPaymentsResponse> {
    this.logger.log(ctx, 'Getting admin payments list');

    const pendingConfirmations =
      await this.paymentConfirmationsService.listPendingConfirmations(ctx);

    if (pendingConfirmations.confirmations.length === 0) {
      return { payments: [], total: 0 };
    }

    const transactionIds = [
      ...new Set(
        pendingConfirmations.confirmations.map((c) => c.transactionId),
      ),
    ];
    const transactions =
      await this.transactionsService.findByIds(ctx, transactionIds);
    const transactionMap = new Map(transactions.map((t) => [t.id, t]));

    const enrichedPayments: AdminPaymentItem[] = [];

    for (const confirmation of pendingConfirmations.confirmations) {
      const transaction = transactionMap.get(confirmation.transactionId);

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
        sellerPlatformFee: {
          amount: transaction.sellerPlatformFee.amount,
          currency: transaction.sellerPlatformFee.currency,
        },
        buyerPlatformFee: {
          amount: transaction.buyerPlatformFee.amount,
          currency: transaction.buyerPlatformFee.currency,
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
    if (pendingEvents.length === 0) {
      return { events: [], total: 0 };
    }

    const eventIds = pendingEvents.map((e) => e.id);
    const pendingListings = await this.ticketsRepository.getPendingByEventIds(
      ctx,
      eventIds,
    );
    const listingsByEventId = new Map<string, typeof pendingListings>();
    for (const l of pendingListings) {
      const arr = listingsByEventId.get(l.eventId) ?? [];
      arr.push(l);
      listingsByEventId.set(l.eventId, arr);
    }

    const enrichedEvents: AdminPendingEventItem[] = [];

    for (const event of pendingEvents) {
      const pendingEventListings = listingsByEventId.get(event.id) ?? [];

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

    const datesChanged =
      (data.dates && data.dates.length > 0) ||
      (data.datesToDelete && data.datesToDelete.length > 0);
    if (data.isPopular !== undefined || datesChanged) {
      void this.eventScoringService
        .requestScoring(ctx, eventId)
        .catch((err) =>
          this.logger.error(ctx, 'Event scoring enqueue failed', {
            eventId,
            error: err,
          }),
        );
    }

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
      `Getting all events - page: ${page}, limit: ${limit}, search: ${query.search || 'none'}, highlighted: ${query.highlighted ?? false}`,
    );

    const { events, total } = await this.eventsService.getAllEventsPaginated(
      ctx,
      { page, limit, search: query.search, highlighted: query.highlighted },
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
    const [listingStatsMap, allDates] = await Promise.all([
      this.ticketsService.getListingStatsByEventIds(ctx, eventIds),
      this.eventsService.getDatesByEventIds(ctx, eventIds),
    ]);

    const datesByEvent = new Map<string, Date[]>();
    for (const d of allDates) {
      const list = datesByEvent.get(d.eventId) ?? [];
      list.push(d.date);
      datesByEvent.set(d.eventId, list);
    }
    for (const list of datesByEvent.values()) {
      list.sort((a, b) => a.getTime() - b.getTime());
    }

    const enrichedEvents: AdminAllEventItem[] = events.map((event) => {
      const creator = creatorsMap.get(event.createdBy);
      const stats = listingStatsMap.get(event.id) || {
        listingsCount: 0,
        availableTicketsCount: 0,
      };
      const eventBanners = event.banners;
      const hasRectangleBanner = eventBanners?.rectangle != null;
      const highlight = event.highlight === true;
      const squareBannerUrl = eventBanners?.square
        ? this.eventsService.getBannerPublicUrl(event.id, eventBanners.square.filename)
        : undefined;

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
        hasRectangleBanner,
        highlight,
        squareBannerUrl,
        venue: event.venue,
        city: event.location.city,
        dates: datesByEvent.get(event.id) ?? [],
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
   * Get full event by ID (all fields, for admin only).
   * Public GET /api/events/:id returns a reduced, non-sensitive shape.
   */
  async getEvent(
    ctx: Ctx,
    eventId: string,
  ): Promise<import('../events/events.api').EventWithDatesResponse> {
    return this.eventsService.getEventById(ctx, eventId);
  }

  /**
   * Get all ticket listings for a specific event.
   * Returns aggregated listing data with seller info, event date, and section.
   */
  async getEventListings(
    ctx: Ctx,
    eventId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<AdminEventListingsResponse> {
    this.logger.log(ctx, `Getting listings for event ${eventId}`, { page, limit });

    const { listings, total } = await this.ticketsRepository.getAllByEventIdPaginated(
      ctx,
      eventId,
      { page, limit },
    );

    if (listings.length === 0) {
      return { listings: [], total };
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
    const enrichedListings: AdminEventListingItem[] = listings.map(
      (listing) => {
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
          eventSlug: eventWithDates.slug,
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
          sellTogether: listing.sellTogether,
          status: listing.status,
          pricePerTicket: {
            amount: listing.pricePerTicket.amount,
            currency: listing.pricePerTicket.currency,
          },
          createdAt: listing.createdAt,
        };
      },
    );

    this.logger.log(
      ctx,
      `Found ${enrichedListings.length} listings (page ${page}) for event ${eventId}, total ${total}`,
    );

    return {
      listings: enrichedListings,
      total,
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

    const filters = await this.resolveTransactionSearchFilters(
      ctx,
      query.search,
    );

    const { transactions, total } = await this.transactionsService.getPaginated(
      ctx,
      page,
      limit,
      filters,
    );

    if (transactions.length === 0) {
      return {
        transactions: [],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    const enriched = await this.enrichTransactionsForList(ctx, transactions);

    this.logger.log(ctx, `Found ${total} transactions, returning page ${page}`);

    return {
      transactions: enriched,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get pending payment confirmations summary with IDs.
   */
  async getTransactionsPendingSummary(
    ctx: Ctx,
  ): Promise<AdminTransactionsPendingSummaryResponse> {
    const [pendingConfirmationTransactionIds, pendingTransactionIds] =
      await Promise.all([
        this.paymentConfirmationsService.getPendingTransactionIds(ctx),
        this.transactionsService.getIdsByStatuses(ctx, [
          TransactionStatus.PaymentPendingVerification,
        ]),
      ]);

    return {
      pendingConfirmationsCount: pendingConfirmationTransactionIds.length,
      pendingTransactionsCount: pendingTransactionIds.length,
      pendingConfirmationTransactionIds,
      pendingTransactionIds,
    };
  }

  async getTransactionAuditLogs(
    ctx: Ctx,
    transactionId: string,
    order?: string,
  ): Promise<AdminTransactionAuditLogsResponse> {
    const sortOrder: 'asc' | 'desc' = order === 'asc' ? 'asc' : 'desc';
    return this.transactionsService.getTransactionAuditLogs(
      ctx,
      transactionId,
      sortOrder,
    );
  }

  async getTransactionChatMessages(
    ctx: Ctx,
    transactionId: string,
  ): Promise<AdminTransactionChatMessagesResponse> {
    return this.transactionChatService.getMessagesForAdmin(ctx, transactionId);
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

    const [confirmations, payoutReceipts] = await Promise.all([
      this.paymentConfirmationsService.findByTransactionIds(ctx, [
        transaction.id,
      ]),
      this.prisma.payoutReceiptFile.findMany({
        where: { transactionId: transaction.id },
        orderBy: { uploadedAt: 'asc' },
      }),
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
    const payoutReceiptFiles = payoutReceipts.map((receipt) => ({
      id: receipt.id,
      transactionId: receipt.transactionId,
      originalFilename: receipt.originalFilename,
      contentType: receipt.contentType,
      sizeBytes: receipt.sizeBytes,
      uploadedBy: receipt.uploadedBy,
      uploadedAt: receipt.uploadedAt,
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
      eventSlug: listing.eventSlug,
      eventName: listing.eventName,
      eventDate: listing.eventDate,
      sectionName: listing.sectionName,
      quantity: transaction.quantity,
      pricePerTicket: listing.pricePerTicket,
    };

    let paymentMethodDetail: AdminTransactionDetailResponse['paymentMethod'];
    let bankTransferDestination: AdminTransactionDetailResponse['bankTransferDestination'];

    if (transaction.paymentMethodId) {
      try {
        const paymentMethod = await this.paymentMethodsService.findById(
          ctx,
          transaction.paymentMethodId,
        );
        paymentMethodDetail = {
          id: paymentMethod.id,
          type: paymentMethod.type,
          name: paymentMethod.publicName,
        };
        const config = paymentMethod.bankTransferConfig;
        if (config) {
          bankTransferDestination = {
            holderName: config.accountHolderName,
            cbuOrCvu: config.cbu,
            bankName: config.bankName,
            cuitCuil: config.cuitCuil,
          };
        }
      } catch (error) {
        this.logger.warn(
          ctx,
          `Payment method not found for transaction ${transaction.id}: ${error}`,
        );
      }
    }
    if (!bankTransferDestination && seller?.bankAccount) {
      bankTransferDestination = {
        holderName: seller.bankAccount.holderName,
        cbuOrCvu: seller.bankAccount.cbuOrCvu,
        ...(seller.bankAccount.alias && { alias: seller.bankAccount.alias }),
      };
    }

    const appliedPromotion = listing.promotionSnapshot
      ? {
          id: listing.promotionSnapshot.id,
          name: listing.promotionSnapshot.name,
          type: listing.promotionSnapshot.type,
          config: listing.promotionSnapshot.config as unknown as Record<
            string,
            unknown
          >,
        }
      : undefined;

    return {
      id: transaction.id,
      seller: sellerRef,
      buyer: buyerRef,
      status: transaction.status,
      listing: listingRef,
      quantity: transaction.quantity,
      ticketPrice: transaction.ticketPrice,
      buyerPlatformFee: transaction.buyerPlatformFee,
      sellerPlatformFee: transaction.sellerPlatformFee,
      paymentMethodCommission: transaction.paymentMethodCommission,
      totalPaid: transaction.totalPaid,
      sellerReceives: transaction.sellerReceives,
      paymentMethodId: transaction.paymentMethodId,
      paymentMethod: paymentMethodDetail,
      appliedPromotion,
      createdAt: transaction.createdAt,
      paymentReceivedAt: transaction.paymentReceivedAt,
      ticketTransferredAt: transaction.ticketTransferredAt,
      buyerConfirmedAt: transaction.buyerConfirmedAt,
      completedAt: transaction.completedAt,
      cancelledAt: transaction.cancelledAt,
      refundedAt: transaction.refundedAt,
      paymentApprovedAt: transaction.paymentApprovedAt,
      paymentApprovedBy: transaction.paymentApprovedBy,
      disputeId: transaction.disputeId,
      paymentConfirmations,
      payoutReceiptFiles,
      transferProofStorageKey: transaction.transferProofStorageKey,
      transferProofOriginalFilename: transaction.transferProofOriginalFilename,
      receiptProofStorageKey: transaction.receiptProofStorageKey,
      receiptProofOriginalFilename: transaction.receiptProofOriginalFilename,
      bankTransferDestination,
    };
  }

  /**
   * Update transaction by ID (admin). Parses request and delegates to transactions service.
   */
  async updateTransaction(
    ctx: Ctx,
    transactionId: string,
    body: AdminUpdateTransactionRequest,
  ): Promise<AdminTransactionDetailResponse> {
    const parseDate = (s: string | null | undefined): Date | undefined => {
      if (s == null || s === '') return undefined;
      const d = new Date(s);
      return Number.isNaN(d.getTime()) ? undefined : d;
    };

    const updates: Partial<Transaction> = {};
    if (body.status !== undefined)
      updates.status = body.status as TransactionStatus;
    if (body.quantity !== undefined) updates.quantity = body.quantity;
    if (body.ticketPrice !== undefined)
      updates.ticketPrice = body.ticketPrice as Transaction['ticketPrice'];
    if (body.buyerPlatformFee !== undefined)
      updates.buyerPlatformFee =
        body.buyerPlatformFee as Transaction['buyerPlatformFee'];
    if (body.sellerPlatformFee !== undefined)
      updates.sellerPlatformFee =
        body.sellerPlatformFee as Transaction['sellerPlatformFee'];
    if (body.paymentMethodCommission !== undefined)
      updates.paymentMethodCommission =
        body.paymentMethodCommission as Transaction['paymentMethodCommission'];
    if (body.totalPaid !== undefined)
      updates.totalPaid = body.totalPaid as Transaction['totalPaid'];
    if (body.sellerReceives !== undefined)
      updates.sellerReceives =
        body.sellerReceives as Transaction['sellerReceives'];
    if (body.paymentReceivedAt !== undefined)
      updates.paymentReceivedAt =
        parseDate(body.paymentReceivedAt) ?? undefined;
    if (body.ticketTransferredAt !== undefined)
      updates.ticketTransferredAt =
        parseDate(body.ticketTransferredAt) ?? undefined;
    if (body.buyerConfirmedAt !== undefined)
      updates.buyerConfirmedAt = parseDate(body.buyerConfirmedAt) ?? undefined;
    if (body.completedAt !== undefined)
      updates.completedAt = parseDate(body.completedAt) ?? undefined;
    if (body.cancelledAt !== undefined)
      updates.cancelledAt = parseDate(body.cancelledAt) ?? undefined;
    if (body.refundedAt !== undefined)
      updates.refundedAt = parseDate(body.refundedAt) ?? undefined;
    if (body.paymentApprovedAt !== undefined)
      updates.paymentApprovedAt =
        parseDate(body.paymentApprovedAt) ?? undefined;
    if (body.paymentApprovedBy !== undefined)
      updates.paymentApprovedBy = body.paymentApprovedBy ?? undefined;
    if (body.disputeId !== undefined)
      updates.disputeId = body.disputeId ?? undefined;
    if (body.buyerId !== undefined) updates.buyerId = body.buyerId;
    if (body.sellerId !== undefined) updates.sellerId = body.sellerId;
    if (body.listingId !== undefined) updates.listingId = body.listingId;
    if (body.requiredActor !== undefined)
      updates.requiredActor = body.requiredActor as RequiredActor;
    if (body.cancellationReason !== undefined)
      updates.cancellationReason =
        (body.cancellationReason as CancellationReason) ?? undefined;
    if (body.cancelledBy !== undefined)
      updates.cancelledBy = (body.cancelledBy as RequiredActor) ?? undefined;

    await this.transactionsService.updateForAdmin(ctx, transactionId, updates);
    return this.getTransactionById(ctx, transactionId);
  }

  /**
   * Retrieve the transfer proof file (uploaded by seller) for admin preview.
   * Returns null if the transaction has no transfer proof or the object is missing in storage.
   */
  async getTransferProofFileContent(
    ctx: Ctx,
    transactionId: string,
  ): Promise<{ buffer: Buffer; contentType: string; filename: string } | null> {
    const transaction = await this.transactionsService.findById(ctx, transactionId);
    if (!transaction?.transferProofStorageKey) {
      return null;
    }
    const buffer = await this.privateStorage.retrieve(transaction.transferProofStorageKey);
    if (!buffer) {
      this.logger.warn(ctx, `Transfer proof not found in storage: ${transaction.transferProofStorageKey}`);
      return null;
    }
    return {
      buffer,
      contentType: this.mimeTypeFromKey(transaction.transferProofStorageKey),
      filename: transaction.transferProofOriginalFilename ?? 'transfer-proof',
    };
  }

  /**
   * Retrieve the receipt proof file (uploaded by buyer) for admin preview.
   * Returns null if the transaction has no receipt proof or the object is missing in storage.
   */
  async getReceiptProofFileContent(
    ctx: Ctx,
    transactionId: string,
  ): Promise<{ buffer: Buffer; contentType: string; filename: string } | null> {
    const transaction = await this.transactionsService.findById(ctx, transactionId);
    if (!transaction?.receiptProofStorageKey) {
      return null;
    }
    const buffer = await this.privateStorage.retrieve(transaction.receiptProofStorageKey);
    if (!buffer) {
      this.logger.warn(ctx, `Receipt proof not found in storage: ${transaction.receiptProofStorageKey}`);
      return null;
    }
    return {
      buffer,
      contentType: this.mimeTypeFromKey(transaction.receiptProofStorageKey),
      filename: transaction.receiptProofOriginalFilename ?? 'receipt-proof',
    };
  }

  /** Infer a MIME type from a storage key extension (best-effort). */
  private mimeTypeFromKey(key: string): string {
    const ext = key.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'application/pdf';
    if (ext === 'png') return 'image/png';
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    return 'application/octet-stream';
  }

  /**
   * Retrieve a payout receipt file's raw content for admin preview/download.
   * Returns null if the file record or storage object does not exist.
   */
  async getPayoutReceiptFileContent(
    ctx: Ctx,
    transactionId: string,
    fileId: string,
  ): Promise<{ buffer: Buffer; contentType: string; filename: string } | null> {
    const record = await this.prisma.payoutReceiptFile.findFirst({
      where: { id: fileId, transactionId },
    });
    if (!record) {
      return null;
    }
    const buffer = await this.privateStorage.retrieve(record.storageKey);
    if (!buffer) {
      this.logger.warn(
        ctx,
        `Payout receipt file not found in storage: ${record.storageKey}`,
      );
      return null;
    }
    return {
      buffer,
      contentType: record.contentType,
      filename: record.originalFilename,
    };
  }

  /**
   * Retrieve the square banner raw bytes for a given event.
   * Delegates to EventsService to stream the image without CORS issues.
   */
  async getEventSquareBannerContent(
    ctx: Ctx,
    eventId: string,
  ): Promise<{ buffer: Buffer; contentType: string; filename: string } | null> {
    return this.eventsService.getSquareBannerContent(ctx, eventId);
  }

  /**
   * List all transactions in TransferringFund status for admin "pago a vendedores" page.
   */
  async getSellerPayouts(ctx: Ctx): Promise<AdminSellerPayoutsResponse> {
    const ids = await this.transactionsService.getIdsByStatuses(ctx, [
      TransactionStatus.TransferringFund,
    ]);
    if (ids.length === 0) {
      return { payouts: [] };
    }

    const transactions = await this.transactionsService.findByIds(ctx, ids);
    const sellerIds = [...new Set(transactions.map((t) => t.sellerId))];
    const listingIds = [...new Set(transactions.map((t) => t.listingId))];

    const [sellers, listings] = await Promise.all([
      this.usersService.findByIds(ctx, sellerIds),
      this.ticketsService.getListingsByIds(ctx, listingIds),
    ]);
    const listingMap = new Map(listings.map((l) => [l.id, l]));
    const sellerMap = new Map(sellers.map((s) => [s.id, s]));

    const payouts: AdminSellerPayoutItem[] = [];

    for (const transaction of transactions) {
      const listing = listingMap.get(transaction.listingId);
      const seller = sellerMap.get(transaction.sellerId);
      if (!listing) continue;

      // Use only seller's bank account (payout destination), not payment method config (buyer's transfer target).
      const bankTransferDestination: AdminSellerPayoutItem['bankTransferDestination'] =
        seller?.bankAccount
          ? {
              holderName: seller.bankAccount.holderName,
              cbuOrCvu: seller.bankAccount.cbuOrCvu,
              ...(seller.bankAccount.alias && { alias: seller.bankAccount.alias }),
            }
          : undefined;

      // Build ticket line for "Entradas" column: section, quantity, unit price, optional seat labels.
      const unitIdsSet = new Set(transaction.ticketUnitIds);
      const unitsForTxn = listing.ticketUnits.filter((u) =>
        unitIdsSet.has(u.id),
      );
      const seatLabels = unitsForTxn
        .filter((u) => u.seat)
        .map((u) => `${u.seat!.row}${u.seat!.seatNumber}`)
        .sort();
      const unitPriceCents =
        transaction.quantity > 0
          ? Math.round(transaction.ticketPrice.amount / transaction.quantity)
          : 0;
      const ticketLine: AdminSellerPayoutItem['ticketLine'] = {
        sectionName: listing.sectionName,
        quantity: transaction.quantity,
        unitPrice: {
          amount: unitPriceCents,
          currency: transaction.ticketPrice.currency,
        },
        seatLabels: seatLabels.length > 0 ? seatLabels : undefined,
      };

      const sellerVerified =
        seller?.identityVerification?.status ===
        IdentityVerificationStatus.Approved;

      payouts.push({
        transactionId: transaction.id,
        eventName: listing.eventName,
        eventDate: listing.eventDate,
        sellerId: transaction.sellerId,
        sellerName: seller?.publicName ?? 'Unknown',
        sellerEmail: seller?.email ?? '',
        sellerVerified,
        sellerReceives: transaction.sellerReceives,
        bankTransferDestination,
        ticketLine,
      });
    }

    return { payouts };
  }

  /**
   * Mark transaction as payout completed (release funds to seller, set Completed, notify seller).
   * Optionally upload one or more payment receipt files (images or PDF) to private S3 before completing.
   */
  async completePayout(
    ctx: Ctx,
    transactionId: string,
    adminUserId: string,
    files?: Array<{
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    }>,
  ): Promise<AdminCompletePayoutResponse> {
    if (files?.length) {
      for (const file of files) {
        if (
          !AdminService.PAYOUT_RECEIPT_MIME_TYPES.includes(
            file.mimetype as (typeof AdminService.PAYOUT_RECEIPT_MIME_TYPES)[number],
          )
        ) {
          throw new BadRequestException(
            `Invalid file type. Allowed: ${AdminService.PAYOUT_RECEIPT_MIME_TYPES.join(', ')}`,
          );
        }
        if (file.size > AdminService.PAYOUT_RECEIPT_MAX_SIZE_BYTES) {
          throw new BadRequestException(
            `File too large. Maximum size: ${AdminService.PAYOUT_RECEIPT_MAX_SIZE_BYTES / 1024 / 1024}MB`,
          );
        }
      }
      const ext = (name: string) => name.split('.').pop() || 'bin';
      for (const file of files) {
        const key = `payout-receipts/${transactionId}_${Date.now()}_${randomBytes(6).toString('hex')}.${ext(file.originalname)}`;
        await this.privateStorage.store(key, file.buffer, {
          contentType: file.mimetype,
          contentLength: file.size,
          originalFilename: file.originalname,
        });
        await this.prisma.payoutReceiptFile.create({
          data: {
            transactionId,
            storageKey: key,
            originalFilename: file.originalname,
            contentType: file.mimetype,
            sizeBytes: file.size,
            uploadedBy: adminUserId,
          },
        });
      }
      this.logger.log(
        ctx,
        `Uploaded ${files.length} payout receipt(s) for transaction ${transactionId}`,
      );
    }
    const transaction = await this.transactionsService.completePayout(
      ctx,
      transactionId,
    );
    return {
      id: transaction.id,
      status: transaction.status,
    };
  }

  private async resolveTransactionSearchFilters(
    ctx: Ctx,
    search?: string,
  ): Promise<
    | {
        transactionIds?: string[];
        buyerIds?: string[];
        sellerIds?: string[];
      }
    | undefined
  > {
    if (!search?.trim()) return undefined;

    const term = search.trim();

    const filters: {
      transactionIds?: string[];
      buyerIds?: string[];
      sellerIds?: string[];
    } = {};

    // Support comma-separated transaction IDs (e.g. from pending summary click).
    if (term.includes(',')) {
      const ids = term
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      if (ids.length > 0) {
        filters.transactionIds = ids;
        return filters;
      }
    }

    // Single transaction ID or email search.
    filters.transactionIds = [term];

    const usersByEmail = await this.usersService.findByEmailContaining(
      ctx,
      term,
    );
    if (usersByEmail.length > 0) {
      const userIds = usersByEmail.map((u) => u.id);
      filters.buyerIds = userIds;
      filters.sellerIds = userIds;
    }

    if (
      !filters.buyerIds &&
      !filters.sellerIds &&
      (!filters.transactionIds || filters.transactionIds.length === 0)
    ) {
      return { transactionIds: ['__no_match__'] };
    }

    const hasEmailMatches =
      (filters.buyerIds?.length ?? 0) > 0 ||
      (filters.sellerIds?.length ?? 0) > 0;
    const hasTransactionIds =
      filters.transactionIds && filters.transactionIds.length > 0;
    if (!hasEmailMatches && hasTransactionIds && !term.startsWith('txn_')) {
      // For non transaction-id text (e.g. random keyword) with no email matches,
      // avoid returning all rows by forcing a no-match filter.
      return { transactionIds: ['__no_match__'] };
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
      this.paymentConfirmationsService.findByTransactionIds(
        ctx,
        transactionIds,
      ),
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
        eventSlug: listing?.eventSlug ?? 'event-unknown',
        eventName: listing?.eventName ?? 'Unknown Event',
        eventDate: listing?.eventDate ?? new Date(),
        sectionName: listing?.sectionName ?? 'Unknown',
        quantity: t.quantity,
        pricePerTicket: listing?.pricePerTicket ?? {
          amount: 0,
          currency: 'USD',
        },
      };

      const paymentConfirmation:
        | AdminTransactionPaymentConfirmationRef
        | undefined = confirmation
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

  // ==================== Support Tickets (admin) ====================

  private mapTicketToAdminItem(t: SupportTicket): AdminSupportTicketItem {
    return {
      id: t.id,
      userId: t.userId,
      transactionId: t.transactionId,
      category: t.category,
      source: t.source,
      subject: t.subject,
      description: t.description,
      guestName: t.guestName,
      guestEmail: t.guestEmail,
      guestId: t.guestId,
      status: t.status,
      priority: t.priority,
      resolution: t.resolution,
      resolutionNotes: t.resolutionNotes,
      resolvedBy: t.resolvedBy,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      resolvedAt: t.resolvedAt,
    };
  }

  private mapMessageToAdminItem(
    m: SupportMessage,
  ): AdminSupportTicketDetailResponse['messages'][0] {
    return {
      id: m.id,
      ticketId: m.ticketId,
      userId: m.userId,
      isAdmin: m.isAdmin,
      message: m.message,
      attachmentUrls: m.attachmentUrls,
      createdAt: m.createdAt,
    };
  }

  async getSupportTickets(
    ctx: Ctx,
    query: AdminSupportTicketsQuery,
  ): Promise<AdminSupportTicketsResponse> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const { tickets, total } = await this.supportService.listTicketsAdmin(ctx, {
      page,
      limit,
      status: query.status,
      category: query.category,
      source: query.source,
    });
    const userIds = [
      ...new Set(tickets.map((t) => t.userId).filter(Boolean)),
    ] as string[];
    const users =
      userIds.length > 0 ? await this.usersService.findByIds(ctx, userIds) : [];
    const userMap = new Map(
      users.map((u) => [u.id, { name: u.publicName, email: u.email }]),
    );
    const totalPages = Math.ceil(total / limit);
    return {
      tickets: tickets.map((t) => ({
        ...this.mapTicketToAdminItem(t),
        initiatorName: t.userId ? userMap.get(t.userId)?.name : t.guestName,
        initiatorEmail: t.userId ? userMap.get(t.userId)?.email : t.guestEmail,
      })),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getSupportTicketById(
    ctx: Ctx,
    ticketId: string,
    adminId: string,
  ): Promise<AdminSupportTicketDetailResponse> {
    const ticket = await this.supportService.getTicketById(
      ctx,
      ticketId,
      adminId,
      Role.Admin,
    );
    const base = this.mapTicketToAdminItem(ticket);
    let initiatorName: string | undefined;
    let initiatorEmail: string | undefined;
    if (ticket.userId) {
      const users = await this.usersService.findByIds(ctx, [ticket.userId]);
      const user = users[0];
      initiatorName = user?.publicName;
      initiatorEmail = user?.email;
    } else {
      initiatorName = ticket.guestName;
      initiatorEmail = ticket.guestEmail;
    }
    let transactionSummary: AdminSupportTicketTransactionSummary | undefined;
    if (ticket.transactionId) {
      const transaction = await this.transactionsService.findById(
        ctx,
        ticket.transactionId,
      );
      if (transaction) {
        const initiatorRole: 'buyer' | 'seller' | undefined = ticket.userId
          ? ticket.userId === transaction.buyerId
            ? 'buyer'
            : 'seller'
          : undefined;
        transactionSummary = {
          initiatorRole,
          status: transaction.status,
          ticketPrice: {
            amount: transaction.ticketPrice.amount,
            currency: transaction.ticketPrice.currency,
          },
          quantity: transaction.quantity,
          totalPaid: {
            amount: transaction.totalPaid.amount,
            currency: transaction.totalPaid.currency,
          },
          sellerReceives: {
            amount: transaction.sellerReceives.amount,
            currency: transaction.sellerReceives.currency,
          },
        };
      }
    }
    return {
      ...base,
      initiatorName,
      initiatorEmail,
      transactionSummary,
      messages: ticket.messages.map((m) => this.mapMessageToAdminItem(m)),
    };
  }

  async updateSupportTicketStatus(
    ctx: Ctx,
    ticketId: string,
    status: string,
  ): Promise<AdminUpdateSupportTicketStatusResponse> {
    const statusEnum = status as SupportTicketStatus;
    const ticket = await this.supportService.updateTicketStatus(
      ctx,
      ticketId,
      statusEnum,
    );
    return this.mapTicketToAdminItem(ticket);
  }

  async resolveSupportDispute(
    ctx: Ctx,
    ticketId: string,
    adminId: string,
    body: { resolution: string; resolutionNotes: string },
  ): Promise<AdminResolveSupportDisputeResponse> {
    const resolution = body.resolution as DisputeResolution;
    const ticket = await this.supportService.resolveDispute(
      ctx,
      ticketId,
      adminId,
      resolution,
      body.resolutionNotes,
    );
    return this.mapTicketToAdminItem(ticket);
  }

  async addSupportTicketMessage(
    ctx: Ctx,
    ticketId: string,
    adminId: string,
    body: { message: string; attachmentUrls?: string[] },
  ): Promise<AdminAddSupportTicketMessageResponse> {
    const message = await this.supportService.addMessage(
      ctx,
      ticketId,
      adminId,
      true,
      body.message,
      body.attachmentUrls,
    );
    return { success: true, messageId: message.id };
  }

  /**
   * Validate import events payload. Returns validation errors per event index or the parsed payload.
   */
  validateImportEvents(
    payload: unknown,
  ):
    | { valid: true; data: ImportEventsPayload }
    | { valid: false; errors: ImportEventValidationError[] } {
    const result = ImportEventsPayloadSchema.safeParse(payload);
    if (result.success) {
      return { valid: true, data: result.data };
    }
    const errors = this.formatZodErrorsToImportErrors(result.error);
    return { valid: false, errors };
  }

  /**
   * Build preview for import (no persistence). Validates payload, dedupes by (sourceCode, sourceId)
   * within the payload and against existing events in the DB, then returns preview.
   */
  async getImportPreview(
    ctx: Ctx,
    payload: ImportEventsPayload,
  ): Promise<ImportEventsPreviewResponse> {
    this.logger.debug(ctx, 'getImportPreview', {
      eventCount: payload.events.length,
    });

    const deduped = this.dedupeImportEventsBySource(payload.events);
    const existingKeys = await this.eventsService.getExistingImportSourceKeys(ctx);
    const now = new Date();
    const toImport = deduped
      .filter((item) => {
        const key = `${item.sourceCode}:${item.sourceId}`;
        return !existingKeys.has(key);
      })
      .map((item) => ({
        ...item,
        dates: item.dates.filter((d) => new Date(d) > now),
      }))
      .filter((item) => item.dates.length > 0);

    const events: ImportEventsPreviewItem[] = toImport.map((item, index) => {
      const previewId = `preview-${index}`;
      const slug = generateEventSlug(item.name, item.venue, previewId);
      const dateLabels = item.dates.map((d) => {
        try {
          const date = new Date(d);
          return date.toISOString();
        } catch {
          return d;
        }
      });
      return {
        index,
        name: item.name,
        category: item.category,
        venue: item.venue,
        location: item.location,
        slug,
        datesCount: item.dates.length,
        dateLabels,
        sections: item.sections,
        sourceCode: item.sourceCode,
        sourceId: item.sourceId,
        ticketApp: item.ticketApp,
        transferable: item.transferable,
        artists: item.artists ?? [],
        isPopular: item.popular,
      };
    });

    return { events, eventsForImport: toImport };
  }

  /**
   * Parse base64 or data URL image string into buffer and mime type.
   * Accepts: "data:image/png;base64,..." or raw base64 (defaults to image/jpeg).
   * Returns null if invalid or unsupported mime type.
   */
  private parseBase64Image(
    value: string,
  ): { buffer: Buffer; mimeType: string } | null {
    const trimmed = value.trim();
    if (!trimmed) return null;

    let base64: string;
    let mimeType = 'image/jpeg';

    if (trimmed.startsWith('data:')) {
      const match = trimmed.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/i);
      if (!match) return null;
      mimeType = match[1].toLowerCase();
      base64 = match[2];
    } else {
      base64 = trimmed;
    }

    try {
      const buffer = Buffer.from(base64, 'base64');
      if (buffer.length === 0) return null;
      return { buffer, mimeType };
    } catch {
      return null;
    }
  }

  /**
   * Store event banner images from import item base64 fields.
   * Logs and skips on decode or upload failure so event import still succeeds.
   */
  private async storeImportBannerImages(
    ctx: Ctx,
    eventId: string,
    adminId: string,
    item: ImportEventItem,
  ): Promise<void> {
    const bannerFields: { key: keyof ImportEventItem; type: EventBannerType }[] = [
      { key: 'imageSquareBase64', type: 'square' },
      { key: 'imageRectangleBase64', type: 'rectangle' },
      { key: 'imageOGBase64', type: 'og_image' },
    ];

    for (const { key, type } of bannerFields) {
      const base64 = item[key];
      if (typeof base64 !== 'string') continue;

      const parsed = this.parseBase64Image(base64);
      if (!parsed) {
        this.logger.warn(ctx, 'Import banner skipped: invalid base64 or mime', {
          eventId,
          bannerType: type,
        });
        continue;
      }

      try {
        const ext =
          parsed.mimeType === 'image/png'
            ? 'png'
            : parsed.mimeType === 'image/webp'
              ? 'webp'
              : 'jpg';
        await this.eventsService.uploadBanner(
          ctx,
          eventId,
          adminId,
          Role.Admin,
          type,
          {
            buffer: parsed.buffer,
            originalname: `${type}.${ext}`,
            mimetype: parsed.mimeType,
            size: parsed.buffer.length,
          },
        );
      } catch (err) {
        this.logger.warn(ctx, 'Import banner upload failed', {
          eventId,
          bannerType: type,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  /**
   * Dedupe import events by (sourceCode, sourceId), keeping first occurrence.
   */
  private dedupeImportEventsBySource(
    items: ImportEventItem[],
  ): ImportEventItem[] {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = `${item.sourceCode}:${item.sourceId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Execute import: create events, dates, and sections (all approved). Uses admin as createdBy/approvedBy.
   * Returns per-event results; partial success is allowed (failed events are reported, created ones are committed).
   */
  async executeImport(
    ctx: Ctx,
    payload: ImportEventsPayload,
    adminId: string,
  ): Promise<ImportEventsResultResponse> {
    this.logger.log(ctx, 'executeImport', {
      adminId,
      eventCount: payload.events.length,
    });

    const results: ImportEventResultItem[] = [];
    let created = 0;
    let failed = 0;

    const sections = (item: ImportEventItem) => item.sections ?? [];

    for (let index = 0; index < payload.events.length; index++) {
      const item = payload.events[index];
      try {
        const createRequest: CreateEventRequest = {
          name: item.name,
          category: item.category as EventCategory,
          venue: item.venue,
          location: item.location,
          importInfo: { sourceCode: item.sourceCode, sourceId: item.sourceId },
          ...(item.slug != null &&
            item.slug.trim() !== '' && { slug: item.slug.trim() }),
          ticketApp: item.ticketApp,
          transferable: item.transferable,
          artists: item.artists ?? [],
          isPopular: item.popular,
          // isManualCreation is intentionally not forwarded
        };
        const event = await this.eventsService.createEvent(
          ctx,
          adminId,
          Role.Admin,
          createRequest,
        );

        for (const dateStr of item.dates) {
          await this.eventsService.addEventDate(
            ctx,
            event.id,
            adminId,
            Role.Admin,
            { date: dateStr },
          );
        }

        for (const section of sections(item)) {
          await this.eventsService.addEventSection(
            ctx,
            event.id,
            adminId,
            Role.Admin,
            {
              name: section.name,
              seatingType: section.seatingType as SeatingType,
            },
          );
        }

        await this.storeImportBannerImages(ctx, event.id, adminId, item);

        results.push({
          index,
          success: true,
          eventId: event.id,
          slug: event.slug,
          name: event.name,
        });
        created++;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unknown error during import';
        this.logger.warn(ctx, 'Import event failed', {
          index,
          name: item.name,
          error: message,
        });
        results.push({
          index,
          success: false,
          name: item.name,
          error: message,
        });
        failed++;
      }
    }

    return {
      total: payload.events.length,
      created,
      failed,
      results,
    };
  }

  private formatZodErrorsToImportErrors(
    error: z.ZodError,
  ): ImportEventValidationError[] {
    const errors: ImportEventValidationError[] = [];
    const seen = new Set<string>();

    for (const issue of error.issues) {
      const path = issue.path;
      let index = -1;
      if (path[0] === 'events' && typeof path[1] === 'number') {
        index = path[1];
      }
      const key = `${index}:${issue.path.join('.')}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const field =
        path.length > 2 ? String(path.slice(2).join('.')) : undefined;
      errors.push({
        index: index >= 0 ? index : 0,
        message: issue.message,
        field,
      });
    }

    return errors.sort((a, b) => a.index - b.index);
  }
}
