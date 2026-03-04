import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
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
  AdminTransactionDetailResponse,
  AdminTransactionUserRef,
  AdminTransactionListingRef,
  AdminTransactionPaymentConfirmationRef,
  Money,
  AdminUserSearchResponse,
  AdminSellerPayoutsResponse,
  AdminSellerPayoutItem,
  AdminCompletePayoutResponse,
} from './admin.api';
import { EventDateStatus, EventSectionStatus } from '../events/events.domain';
import { IdentityVerificationStatus } from '../users/users.domain';
import type { Transaction } from '../transactions/transactions.domain';
import { TransactionStatus } from '../transactions/transactions.domain';

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
  ) {}

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
  async searchUsersByEmail(ctx: Ctx, searchTerm: string): Promise<AdminUserSearchResponse> {
    const term = searchTerm?.trim() ?? '';
    if (term.length < 2) return [];
    const users = await this.usersService.findByEmailContaining(ctx, term);
    return users.slice(0, AdminService.USER_SEARCH_LIMIT).map((u) => ({
      id: u.id,
      email: u.email,
    }));
  }

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
   * Get pending payment confirmations summary with IDs.
   */
  async getTransactionsPendingSummary(
    ctx: Ctx,
  ): Promise<AdminTransactionsPendingSummaryResponse> {
    const [
      pendingConfirmationTransactionIds,
      pendingTransactionIds,
    ] = await Promise.all([
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
            iban: config.cbu,
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
    if (
      !bankTransferDestination &&
      seller?.bankAccount
    ) {
      bankTransferDestination = {
        holderName: seller.bankAccount.holderName,
        iban: seller.bankAccount.iban,
        bic: seller.bankAccount.bic,
      };
    }

    const appliedPromotion = listing.promotionSnapshot
      ? {
          id: listing.promotionSnapshot.id,
          name: listing.promotionSnapshot.name,
          type: listing.promotionSnapshot.type,
          config: listing.promotionSnapshot.config as unknown as Record<string, unknown>,
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
      bankTransferDestination,
    };
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
   * List all transactions in TransferringFund status for admin "pago a vendedores" page.
   */
  async getSellerPayouts(ctx: Ctx): Promise<AdminSellerPayoutsResponse> {
    const ids = await this.transactionsService.getIdsByStatuses(ctx, [
      TransactionStatus.TransferringFund,
    ]);
    if (ids.length === 0) {
      return { payouts: [] };
    }

    const transactions =
      await this.transactionsService.findByIds(ctx, ids);
    const sellerIds = [...new Set(transactions.map((t) => t.sellerId))];
    const listingIds = [...new Set(transactions.map((t) => t.listingId))];

    const [sellers, listings] = await Promise.all([
      this.usersService.findByIds(ctx, sellerIds),
      Promise.all(
        listingIds.map((id) => this.ticketsService.getListingById(ctx, id)),
      ),
    ]);
    const listingMap = new Map(
      listingIds.map((id, i) => [id, listings[i]]),
    );
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
              iban: seller.bankAccount.iban,
              bic: seller.bankAccount.bic,
            }
          : undefined;

      // Build ticket line for "Entradas" column: section, quantity, unit price, optional seat labels.
      const unitIdsSet = new Set(transaction.ticketUnitIds);
      const unitsForTxn = listing.ticketUnits.filter((u) => unitIdsSet.has(u.id));
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
        seller?.identityVerification?.status === IdentityVerificationStatus.Approved;

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
    files?: Array<{ buffer: Buffer; originalname: string; mimetype: string; size: number }>,
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
    const transaction =
      await this.transactionsService.completePayout(ctx, transactionId);
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
      const ids = term.split(',').map((id) => id.trim()).filter(Boolean);
      if (ids.length > 0) {
        filters.transactionIds = ids;
        return filters;
      }
    }

    // Single transaction ID or email search.
    filters.transactionIds = [term];

    const usersByEmail =
      await this.usersService.findByEmailContaining(ctx, term);
    if (usersByEmail.length > 0) {
      const userIds = usersByEmail.map((u) => u.id);
      filters.buyerIds = userIds;
      filters.sellerIds = userIds;
    }

    if (!filters.buyerIds && !filters.sellerIds && (!filters.transactionIds || filters.transactionIds.length === 0)) {
      return { transactionIds: ['__no_match__'] };
    }

    const hasEmailMatches =
      (filters.buyerIds?.length ?? 0) > 0 || (filters.sellerIds?.length ?? 0) > 0;
    const hasTransactionIds = filters.transactionIds && filters.transactionIds.length > 0;
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
