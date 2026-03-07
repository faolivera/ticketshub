import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
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
import { TransactionStatus, getTransactionChatMode } from '../transactions/transactions.domain';
import { Role } from '../users/users.domain';
import type { Ctx } from '../../common/types/context';
import type {
  BffTransactionWithDetails,
  GetMyTicketsData,
  GetTransactionDetailsResponse,
  TransactionReviewsData,
} from './bff.api';
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
import type { GetSellTicketConfigResponse } from './bff.api';

@Injectable()
export class BffService {
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
  ) {}

  /**
   * Get event page data: event details + enriched listings in a single call.
   */
  async getEventPageData(
    ctx: Ctx,
    eventId: string,
  ): Promise<EventPageData> {
    const [event, listings] = await Promise.all([
      this.eventsService.getEventById(ctx, eventId),
      this.getEventListings(ctx, eventId),
    ]);
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
      .map((pm) => (pm.buyerCommissionPercent != null ? platformCommissionPercent + pm.buyerCommissionPercent : null))
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
    const platformConfig = await this.platformConfigService.getPlatformConfig(ctx);
    const activePromotion =
      await this.promotionsService.getActivePromotionSummary(ctx, userId);
    return {
      sellerPlatformFeePercentage: platformConfig.sellerPlatformFeePercentage,
      ...(activePromotion && { activePromotion }),
    };
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
      this.usersService.getPublicUserInfoByIds(ctx, [listing.sellerId]).then((a) => a[0]),
      this.usersService.findById(ctx, listing.sellerId),
      this.transactionsService.getSellerCompletedSalesTotal(ctx, listing.sellerId),
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
      memberSince: user?.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString(),
    };

    const pricingSnapshot: BuyPagePricingSnapshot = {
      id: snapshot.id,
      expiresAt: snapshot.expiresAt,
    };

    const buyPagePaymentMethods: BuyPagePaymentMethodOption[] = paymentMethods.map(
      (pm) => ({
        id: pm.id,
        name: pm.name,
        serviceFeePercent:
          snapshot.buyerPlatformFeePercentage +
          (pm.buyerCommissionPercent ?? 0),
      }),
    );

    let checkoutRisk: BuyPageData['checkoutRisk'];
    if (buyerId) {
      const quantity = 1;
      const amountMajor = (listing.pricePerTicket.amount * quantity) / 100;
      const risk = await this.riskEngine.evaluateCheckoutRisk(ctx, buyerId, {
        quantity,
        amountUsd: amountMajor,
        eventStartsAt: listing.eventDate,
        sellerId: listing.sellerId,
      });
      checkoutRisk = {
        requireV1: risk.requireV1,
        requireV2: risk.requireV2,
        requireV3: risk.requireV3,
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
        console.warn('getTransactionDetails: no payment confirmation yet', error);
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
        console.warn('getTransactionDetails: failed to load reviews', error);
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
        console.warn('getTransactionDetails: failed to load payment method', error);
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
      console.warn('getTransactionDetails: listing not found or gone', error);
    }

    const bffTransaction: BffTransactionWithDetails = this.toBffTransaction(transaction);

    let chat: GetTransactionDetailsResponse['chat'];
    const chatMode = getTransactionChatMode(transaction.status);
    if (
      (isBuyer || isSeller) &&
      (chatMode === 'enabled' || chatMode === 'only_read')
    ) {
      const config = await this.platformConfigService.getPlatformConfig(ctx);
      const hasUnreadMessages =
        await this.transactionChatService.hasUnreadMessages(
          ctx,
          transactionId,
          userId,
        );
      chat = {
        chatMode,
        chatPollIntervalSeconds: config.transactionChatPollIntervalSeconds,
        chatMaxMessages: config.transactionChatMaxMessages,
        hasUnreadMessages,
      };
    }

    return {
      transaction: bffTransaction,
      paymentConfirmation,
      reviews,
      bankTransferConfig,
      ticketUnits,
      paymentMethodPublicName,
      ...(chat && { chat }),
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
