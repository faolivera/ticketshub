import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { TransactionsService } from '../transactions/transactions.service';
import { TicketsService } from '../tickets/tickets.service';
import { ReviewsService } from '../reviews/reviews.service';
import { PaymentConfirmationsService } from '../payment-confirmations/payment-confirmations.service';
import { PaymentMethodsService } from '../payments/payment-methods.service';
import { PricingService } from '../payments/pricing/pricing.service';
import { PlatformConfigService } from '../config/config.service';
import { PromotionsService } from '../promotions/promotions.service';
import { TransactionChatService } from '../transaction-chat/transaction-chat.service';
import { EventsService } from '../events/events.service';
import { TicketUnitStatus } from '../tickets/tickets.domain';
import {
  TransactionStatus,
  getTransactionChatMode,
} from '../transactions/transactions.domain';
import { Role } from '../users/users.domain';
import type { Ctx } from '../../common/types/context';
import { ContextLogger } from '../../common/logger/context-logger';
import type {
  BffTransactionWithDetails,
  GetMyTicketsData,
  GetTransactionDetailsResponse,
  TransactionReviewsData,
  GetActivityHistoryData,
  ActivityHistoryItem,
} from './bff.api';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OffersService } from '../offers/offers.service';
import type {
  SellerProfile,
  ListingWithSeller,
  EventPageData,
  BuyPageData,
  BuyPageSellerInfo,
  BuyPagePricingSnapshot,
  BuyPagePaymentMethodOption,
} from './bff.domain';
import { RiskEngineService } from '../risk-engine/risk-engine.service';
import type {
  GetSellTicketConfigResponse,
  ValidateSellListingRequest,
  ValidateSellListingResponse,
} from './bff.api';
import { VerificationHelper } from '../../common/utils/verification-helper';

@Injectable()
export class BffService {
  private readonly logger = new ContextLogger(BffService.name);

  constructor(
    @Inject(UsersService)
    private readonly usersService: UsersService,
    @Inject(TransactionsService)
    private readonly transactionsService: TransactionsService,
    @Inject(TicketsService)
    private readonly ticketsService: TicketsService,
    @Inject(ReviewsService)
    private readonly reviewsService: ReviewsService,
    @Inject(PaymentConfirmationsService)
    private readonly paymentConfirmationsService: PaymentConfirmationsService,
    @Inject(PaymentMethodsService)
    private readonly paymentMethodsService: PaymentMethodsService,
    @Inject(PricingService)
    private readonly pricingService: PricingService,
    @Inject(PlatformConfigService)
    private readonly platformConfigService: PlatformConfigService,
    @Inject(PromotionsService)
    private readonly promotionsService: PromotionsService,
    @Inject(TransactionChatService)
    private readonly transactionChatService: TransactionChatService,
    @Inject(EventsService)
    private readonly eventsService: EventsService,
    @Inject(RiskEngineService)
    private readonly riskEngine: RiskEngineService,
    @Inject(OffersService)
    private readonly offersService: OffersService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get event page data by slug: event details + enriched listings in a single call.
   */
  async getEventPageData(ctx: Ctx, eventSlug: string): Promise<EventPageData> {
    const fullEvent = await this.eventsService.getEventBySlug(ctx, eventSlug);
    const event = this.eventsService.toPublicEventItem(fullEvent, {
      includeStatus: true,
    });
    const listings = await this.getEventListings(ctx, fullEvent.id);
    return { event, listings };
  }

  /**
   * Get event listings enriched with seller public info and reputation.
   * Only returns active listings with available tickets.
   * Uses batch queries to avoid N+1: 1 for listings, 1 for sellers, 1 for reviews,
   * 1 for sales counts, 1 for payment methods, 1 for platform config.
   */
  async getEventListings(
    ctx: Ctx,
    eventId: string,
  ): Promise<ListingWithSeller[]> {
    const listings = await this.ticketsService.listListings(ctx, { eventId });
    const activeListings = listings.filter(
      (l) =>
        l.status === 'Active' &&
        l.ticketUnits.some(
          (unit) => unit.status === TicketUnitStatus.Available,
        ),
    );

    if (activeListings.length === 0) return [];

    const uniqueSellerIds = [...new Set(activeListings.map((l) => l.sellerId))];

    const [sellers, metricsMap, paymentMethods, platformConfig] =
      await Promise.all([
        this.usersService.getPublicUserInfoByIds(ctx, uniqueSellerIds),
        this.reviewsService.getSellerMetricsBatch(ctx, uniqueSellerIds),
        this.paymentMethodsService.getPublicPaymentMethods(ctx),
        this.platformConfigService.getPlatformConfig(ctx),
      ]);

    const sellersMap = new Map(sellers.map((s) => [s.id, s]));

    const platformCommissionPercent = platformConfig.buyerPlatformFeePercentage;
    const combinedCommissionPercents = paymentMethods
      .map((pm) =>
        pm.buyerCommissionPercent != null
          ? platformCommissionPercent + pm.buyerCommissionPercent
          : null,
      )
      .filter((p): p is number => p != null);
    const commissionPercentRange =
      combinedCommissionPercents.length > 0
        ? {
            min: Math.min(...combinedCommissionPercents),
            max: Math.max(...combinedCommissionPercents),
          }
        : { min: platformCommissionPercent, max: platformCommissionPercent };

    return activeListings.map((listing) => {
      const seller = sellersMap.get(listing.sellerId);
      const metrics = metricsMap.get(listing.sellerId);
      return {
        ...listing,
        sellerPublicName: seller?.publicName ?? 'Unknown',
        sellerPic: seller?.pic ?? null,
        commissionPercentRange,
        sellerReputation: {
          totalSales: metrics?.totalTransactions ?? 0,
          totalReviews: metrics?.totalReviews ?? 0,
          positivePercent: metrics?.positivePercent ?? null,
          badges: metrics?.badges ?? [],
        },
      };
    });
  }

  async getSellerProfile(ctx: Ctx, sellerId: string): Promise<SellerProfile> {
    const user = await this.usersService.findById(ctx, sellerId);
    if (!user) {
      throw new NotFoundException('Seller not found');
    }

    const [publicInfo] = await this.usersService.getPublicUserInfoByIds(ctx, [
      sellerId,
    ]);
    if (!publicInfo) {
      throw new NotFoundException('Seller not found');
    }

    const [totalSales, reviewData] = await Promise.all([
      this.transactionsService.getSellerCompletedSalesTotal(ctx, sellerId),
      this.reviewsService.getSellerProfileReviews(ctx, sellerId),
    ]);

    return {
      id: sellerId,
      publicName: publicInfo.publicName,
      pic: publicInfo.pic,
      memberSince: new Date(user.createdAt).toISOString(),
      totalSales,
      reviewStats: reviewData.stats,
      reviews: reviewData.reviews,
    };
  }

  /**
   * Get sell-ticket page config: global platform fee % and active promotion for the user (if any).
   */
  async getSellTicketConfig(
    ctx: Ctx,
    userId: string,
  ): Promise<GetSellTicketConfigResponse> {
    const platformConfig =
      await this.platformConfigService.getPlatformConfig(ctx);
    const activePromotion =
      await this.promotionsService.getActivePromotionSummary(ctx, userId);
    return {
      sellerPlatformFeePercentage: platformConfig.sellerPlatformFeePercentage,
      ...(activePromotion && { activePromotion }),
    };
  }

  /**
   * Validate whether the seller can create a listing from a risk perspective (Tier 0 limits).
   * Same logic as createListing risk checks; used by the sell wizard before advancing from the price step.
   */
  async validateSellListing(
    ctx: Ctx,
    userId: string,
    body: ValidateSellListingRequest,
  ): Promise<ValidateSellListingResponse> {
    return this.ticketsService.validateListingRisk(ctx, userId, {
      quantity: body.quantity,
      pricePerTicket: body.pricePerTicket,
    });
  }

  /**
   * Get buy page data: listing, seller info, payment methods, and pricing snapshot.
   * When buyerId is provided, includes checkoutRisk for step-up verification UX.
   */
  async getBuyPageData(
    ctx: Ctx,
    ticketId: string,
    buyerId?: string,
  ): Promise<BuyPageData> {
    const listing = await this.ticketsService.getListingById(ctx, ticketId);
    const [publicInfo, user, totalSales] = await Promise.all([
      this.usersService
        .getPublicUserInfoByIds(ctx, [listing.sellerId])
        .then((a) => a[0]),
      this.usersService.findById(ctx, listing.sellerId),
      this.transactionsService.getSellerCompletedSalesTotal(
        ctx,
        listing.sellerId,
      ),
    ]);
    const [sellerMetrics, paymentMethods, snapshot] = await Promise.all([
      this.reviewsService.getSellerMetrics(ctx, listing.sellerId, {
        user: user ?? undefined,
        totalTransactions: totalSales,
      }),
      this.paymentMethodsService.getPublicPaymentMethods(ctx),
      this.pricingService.createSnapshot(ctx, {
        id: listing.id,
        pricePerTicket: listing.pricePerTicket,
        promotionSnapshot: listing.promotionSnapshot,
      }),
    ]);

    const seller: BuyPageSellerInfo = {
      id: listing.sellerId,
      publicName: publicInfo?.publicName ?? 'Unknown',
      pic: publicInfo?.pic ?? null,
      badges: sellerMetrics.badges,
      totalSales,
      percentPositiveReviews: sellerMetrics.positivePercent,
      totalReviews: sellerMetrics.totalReviews,
      memberSince: user?.createdAt
        ? new Date(user.createdAt).toISOString()
        : new Date().toISOString(),
    };

    const pricingSnapshot: BuyPagePricingSnapshot = {
      id: snapshot.id,
      expiresAt: snapshot.expiresAt,
    };

    const buyPagePaymentMethods: BuyPagePaymentMethodOption[] =
      paymentMethods.map((pm) => ({
        id: pm.id,
        name: pm.name,
        serviceFeePercent:
          snapshot.buyerPlatformFeePercentage +
          (pm.buyerCommissionPercent ?? 0),
      }));

    let checkoutRisk: BuyPageData['checkoutRisk'];
    if (buyerId) {
      const quantity = 1;
      const totalMinor = listing.pricePerTicket.amount * quantity;
      const amount: {
        amount: number;
        currency: 'USD' | 'ARS' | 'EUR' | 'GBP';
      } = {
        amount: totalMinor,
        currency: listing.pricePerTicket.currency,
      };
      const [risk, buyer] = await Promise.all([
        this.riskEngine.evaluateCheckoutRisk(ctx, buyerId, {
          quantity,
          amount,
          eventStartsAt: listing.eventDate,
          sellerId: listing.sellerId,
        }),
        this.usersService.findById(ctx, buyerId),
      ]);
      checkoutRisk = {
        requireV1: risk.requireV1,
        requireV2: risk.requireV2,
        requireV3: risk.requireV3,
        missingV1:
          risk.requireV1 && (!buyer || !VerificationHelper.hasV1(buyer)),
        missingV2:
          risk.requireV2 && (!buyer || !VerificationHelper.hasV2(buyer)),
        missingV3:
          risk.requireV3 && (!buyer || !VerificationHelper.hasV3(buyer)),
      };
    }

    return {
      listing,
      seller,
      paymentMethods: buyPagePaymentMethods,
      pricingSnapshot,
      ...(checkoutRisk && { checkoutRisk }),
    };
  }

  /**
   * Re-evaluate checkout risk for the buy page when quantity or payment method changes.
   * Caller must be authenticated (buyerId required). Returns checkoutRisk for the given quantity and payment method.
   */
  async getCheckoutRisk(
    ctx: Ctx,
    listingId: string,
    buyerId: string,
    quantity: number,
    paymentMethodId: string,
  ): Promise<{ checkoutRisk: NonNullable<BuyPageData['checkoutRisk']> }> {
    const listing = await this.ticketsService.getListingById(ctx, listingId);
    const paymentMethod = await this.paymentMethodsService
      .findById(ctx, paymentMethodId)
      .catch(() => null);
    const qty = Math.max(1, Math.floor(quantity));
    const totalMinor = listing.pricePerTicket.amount * qty;
    const amount: { amount: number; currency: 'USD' | 'ARS' | 'EUR' | 'GBP' } =
      {
        amount: totalMinor,
        currency: listing.pricePerTicket.currency,
      };
    const [risk, buyer] = await Promise.all([
      this.riskEngine.evaluateCheckoutRisk(ctx, buyerId, {
        quantity: qty,
        amount,
        eventStartsAt: listing.eventDate,
        sellerId: listing.sellerId,
        paymentMethodType: paymentMethod?.type,
      }),
      this.usersService.findById(ctx, buyerId),
    ]);
    const checkoutRisk: NonNullable<BuyPageData['checkoutRisk']> = {
      requireV1: risk.requireV1,
      requireV2: risk.requireV2,
      requireV3: risk.requireV3,
      missingV1: risk.requireV1 && (!buyer || !VerificationHelper.hasV1(buyer)),
      missingV2: risk.requireV2 && (!buyer || !VerificationHelper.hasV2(buyer)),
      missingV3: risk.requireV3 && (!buyer || !VerificationHelper.hasV3(buyer)),
    };
    return { checkoutRisk };
  }

  /**
   * Get current user's tickets: bought, sold, and listed.
   * Transactions use BFF view with servicePrice (no buyer commission breakdown).
   */
  async getMyTickets(ctx: Ctx, userId: string): Promise<GetMyTicketsData> {
    const [boughtRaw, soldRaw, listed] = await Promise.all([
      this.transactionsService.listTransactions(ctx, userId, { role: 'buyer' }),
      this.transactionsService.listTransactions(ctx, userId, {
        role: 'seller',
      }),
      this.ticketsService.getMyListings(ctx, userId),
    ]);
    const bought = boughtRaw.map((tx) => this.toBffTransaction(tx));
    const sold = soldRaw.map((tx) => this.toBffTransaction(tx));
    return { bought, sold, listed };
  }

  private encodeActivityHistoryCursor(offset: number): string {
    return Buffer.from(JSON.stringify({ o: offset }), 'utf8').toString(
      'base64url',
    );
  }

  private decodeActivityHistoryCursor(cursor: string | null): number {
    if (!cursor?.trim()) return 0;
    try {
      const raw = Buffer.from(cursor, 'base64url').toString('utf8');
      const j = JSON.parse(raw) as { o?: unknown };
      const o = j.o;
      if (typeof o !== 'number' || !Number.isFinite(o) || o < 0) return 0;
      return Math.floor(o);
    } catch {
      return 0;
    }
  }

  /**
   * Paginated terminal transactions + closed offers (buyer or seller), newest first.
   */
  async getActivityHistory(
    ctx: Ctx,
    userId: string,
    role: 'buyer' | 'seller',
    cursor: string | null,
    limit: number,
  ): Promise<GetActivityHistoryData> {
    if (role !== 'buyer' && role !== 'seller') {
      throw new BadRequestException('role must be buyer or seller');
    }
    const lim = Math.min(Math.max(limit, 1), 50);
    const offset = this.decodeActivityHistoryCursor(cursor);
    const take = lim + 1;

    const buyerUnion = Prisma.sql`
      SELECT * FROM (
        (SELECT t.id, 'transaction'::text AS kind,
          COALESCE(t."completedAt", t."cancelledAt", t."refundedAt", t."updatedAt") AS sort_at
        FROM transactions t
        WHERE t."buyerId" = ${userId}
          AND t.status::text IN ('Completed','Cancelled','Refunded'))
        UNION ALL
        (SELECT o.id, 'offer',
          COALESCE(o."rejectedAt", o."cancelledAt", o."acceptedAt", o."updatedAt") AS sort_at
        FROM offers o
        WHERE o."userId" = ${userId}
          AND o.status::text IN ('rejected','converted','cancelled'))
      ) AS u
      ORDER BY sort_at DESC
      LIMIT ${take}
      OFFSET ${offset}
    `;

    const sellerUnion = Prisma.sql`
      SELECT * FROM (
        (SELECT t.id, 'transaction'::text AS kind,
          COALESCE(t."completedAt", t."cancelledAt", t."refundedAt", t."updatedAt") AS sort_at
        FROM transactions t
        WHERE t."sellerId" = ${userId}
          AND t.status::text IN ('Completed','Cancelled','Refunded'))
        UNION ALL
        (SELECT o.id, 'offer',
          COALESCE(o."rejectedAt", o."cancelledAt", o."acceptedAt", o."updatedAt") AS sort_at
        FROM offers o
        INNER JOIN ticket_listings l ON l.id = o."listingId"
        WHERE l."sellerId" = ${userId}
          AND o.status::text IN ('rejected','converted','cancelled'))
      ) AS u
      ORDER BY sort_at DESC
      LIMIT ${take}
      OFFSET ${offset}
    `;

    const rows = await this.prisma.$queryRaw<
      { id: string; kind: string; sort_at: Date }[]
    >(role === 'buyer' ? buyerUnion : sellerUnion);

    this.logger.debug(ctx, 'getActivityHistory', {
      role,
      rowCount: rows.length,
      offset,
    });

    const hasMore = rows.length > lim;
    const page = hasMore ? rows.slice(0, lim) : rows;
    const txIds = page
      .filter((r) => r.kind === 'transaction')
      .map((r) => r.id);
    const offerIds = page.filter((r) => r.kind === 'offer').map((r) => r.id);

    const [txDetails, buyerOffers, sellerOffers] = await Promise.all([
      this.transactionsService.getTransactionsWithDetailsByIds(ctx, txIds),
      role === 'buyer' && offerIds.length > 0
        ? this.offersService.getOffersWithListingSummaryByIds(ctx, offerIds)
        : Promise.resolve([]),
      role === 'seller' && offerIds.length > 0
        ? this.offersService.getOffersWithReceivedContextByIds(ctx, offerIds)
        : Promise.resolve([]),
    ]);

    const txMap = new Map(
      txDetails.map((t) => [t.id, this.toBffTransaction(t)]),
    );
    const offerMap = new Map<string, (typeof buyerOffers)[0] | (typeof sellerOffers)[0]>();
    if (role === 'buyer') {
      for (const o of buyerOffers) offerMap.set(o.id, o);
    } else {
      for (const o of sellerOffers) offerMap.set(o.id, o);
    }

    const items: ActivityHistoryItem[] = [];
    for (const row of page) {
      if (row.kind === 'transaction') {
        const tx = txMap.get(row.id);
        if (tx) items.push({ type: 'transaction', transaction: tx });
      } else {
        const o = offerMap.get(row.id);
        if (o) items.push({ type: 'offer', offer: o });
      }
    }

    return {
      items,
      hasMore,
      nextCursor: hasMore ? this.encodeActivityHistoryCursor(offset + lim) : null,
    };
  }

  /**
   * Get transaction details aggregating transaction, payment confirmation, and reviews.
   * This is a BFF endpoint that combines multiple data sources for the transaction details page.
   */
  async getTransactionDetails(
    ctx: Ctx,
    transactionId: string,
    userId: string,
    userRole: string,
  ): Promise<GetTransactionDetailsResponse> {
    const transaction = await this.transactionsService.getTransactionById(
      ctx,
      transactionId,
      userId,
    );

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const isBuyer = transaction.buyerId === userId;
    const isSeller = transaction.sellerId === userId;
    const isAdmin = userRole === Role.Admin;

    if (!isBuyer && !isSeller && !isAdmin) {
      throw new ForbiddenException('Access denied');
    }

    let paymentConfirmation = null;
    const shouldShowPaymentConfirmation =
      transaction.paymentMethodId?.includes('bank_transfer') &&
      (isBuyer || isAdmin);
    if (shouldShowPaymentConfirmation) {
      try {
        paymentConfirmation =
          await this.paymentConfirmationsService.getConfirmationByTransaction(
            ctx,
            transactionId,
            userId,
            userRole,
          );
      } catch (error) {
        this.logger.warn(
          ctx,
          'getTransactionDetails: no payment confirmation yet',
          error,
        );
      }
    }

    let reviews: TransactionReviewsData | null = null;
    if (transaction.status === TransactionStatus.Completed) {
      try {
        reviews = await this.reviewsService.getTransactionReviews(
          ctx,
          transactionId,
          userId,
        );
      } catch (error) {
        this.logger.warn(
          ctx,
          'getTransactionDetails: failed to load reviews',
          error,
        );
      }
    }

    let bankTransferConfig = null;
    let paymentMethodPublicName: string | null = null;
    if (transaction.paymentMethodId) {
      try {
        const paymentMethod = await this.paymentMethodsService.findById(
          ctx,
          transaction.paymentMethodId,
        );
        paymentMethodPublicName = paymentMethod?.publicName ?? null;
        if (isBuyer && paymentMethod?.type === 'manual_approval') {
          bankTransferConfig = paymentMethod.bankTransferConfig ?? null;
        }
      } catch (error) {
        this.logger.warn(
          ctx,
          'getTransactionDetails: failed to load payment method',
          error,
        );
      }
    }

    let ticketUnits: GetTransactionDetailsResponse['ticketUnits'] = [];
    try {
      const listing = await this.ticketsService.getListingById(
        ctx,
        transaction.listingId,
      );
      const idSet = new Set(transaction.ticketUnitIds);
      ticketUnits = listing.ticketUnits
        .filter((u) => idSet.has(u.id))
        .map((u) => ({
          id: u.id,
          seat: u.seat,
        }));
    } catch (error) {
      this.logger.warn(
        ctx,
        'getTransactionDetails: listing not found or gone',
        error,
      );
    }

    const bffTransaction: BffTransactionWithDetails =
      this.toBffTransaction(transaction);

    let chat: GetTransactionDetailsResponse['chat'];
    const chatMode = getTransactionChatMode(transaction.status);
    if (
      (isBuyer || isSeller) &&
      (chatMode === 'enabled' || chatMode === 'only_read')
    ) {
      const config = await this.platformConfigService.getPlatformConfig(ctx);
      const [hasUnreadMessages, hasExchangedMessages] = await Promise.all([
        this.transactionChatService.hasUnreadMessages(
          ctx,
          transactionId,
          userId,
        ),
        this.transactionChatService.hasExchangedMessages(
          ctx,
          transactionId,
          userId,
        ),
      ]);
      chat = {
        chatMode,
        chatPollIntervalSeconds: config.transactionChatPollIntervalSeconds,
        chatMaxMessages: config.transactionChatMaxMessages,
        hasUnreadMessages,
        hasExchangedMessages,
      };
    }

    let counterpartyEmail: string | undefined;
    if (isSeller && transaction.buyerId) {
      const buyer = await this.usersService.findById(ctx, transaction.buyerId);
      counterpartyEmail = buyer?.email;
    }

    return {
      transaction: bffTransaction,
      paymentConfirmation,
      reviews,
      bankTransferConfig,
      ticketUnits,
      paymentMethodPublicName,
      ...(chat && { chat }),
      ...(counterpartyEmail !== undefined && { counterpartyEmail }),
    };
  }

  /**
   * Map full transaction to BFF view: single servicePrice (buyer platform + payment method commission).
   * Backend keeps full breakdown; frontend receives one combined value.
   */
  private toBffTransaction(
    tx: Awaited<ReturnType<TransactionsService['getTransactionById']>>,
  ): BffTransactionWithDetails {
    const { buyerPlatformFee, paymentMethodCommission, ...rest } = tx;
    const servicePrice = {
      amount: buyerPlatformFee.amount + paymentMethodCommission.amount,
      currency: buyerPlatformFee.currency,
    };
    return { ...rest, servicePrice } as BffTransactionWithDetails;
  }
}
