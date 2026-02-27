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
import { TicketUnitStatus } from '../tickets/tickets.domain';
import { TransactionStatus } from '../transactions/transactions.domain';
import { UserLevel, Role } from '../users/users.domain';
import type { Ctx } from '../../common/types/context';
import type {
  GetMyTicketsData,
  GetTransactionDetailsResponse,
  TransactionReviewsData,
} from './bff.api';
import type {
  SellerProfile,
  ListingWithSeller,
  BuyPageData,
  BuyPageSellerInfo,
  BuyPagePricingSnapshot,
  BuyPagePaymentMethodOption,
} from './bff.domain';

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
  ) {}

  /**
   * Get event listings enriched with seller public info.
   * Only returns active listings with available tickets.
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

    const uniqueSellerIds = [...new Set(activeListings.map((l) => l.sellerId))];
    const sellers = await this.usersService.getPublicUserInfoByIds(
      ctx,
      uniqueSellerIds,
    );
    const sellersMap = new Map(sellers.map((s) => [s.id, s]));

    const paymentMethods =
      await this.paymentMethodsService.getPublicPaymentMethods(ctx);
    const commissionPercents = paymentMethods
      .map((pm) => pm.buyerCommissionPercent)
      .filter((p): p is number => p != null);
    const commissionPercentRange =
      commissionPercents.length > 0
        ? {
            min: Math.min(...commissionPercents),
            max: Math.max(...commissionPercents),
          }
        : { min: 0, max: 0 };

    return activeListings.map((listing) => {
      const seller = sellersMap.get(listing.sellerId);
      return {
        ...listing,
        sellerPublicName: seller?.publicName ?? 'Unknown',
        sellerPic: seller?.pic ?? {
          id: 'default',
          src: '/images/default/default.png',
        },
        commissionPercentRange,
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
   * Get buy page data: listing, seller info, payment methods, and pricing snapshot.
   */
  async getBuyPageData(ctx: Ctx, ticketId: string): Promise<BuyPageData> {
    const listing = await this.ticketsService.getListingById(ctx, ticketId);
    const [publicInfo] = await this.usersService.getPublicUserInfoByIds(ctx, [
      listing.sellerId,
    ]);
    const [user, totalSales, sellerMetrics, paymentMethods, snapshot] =
      await Promise.all([
        this.usersService.findById(ctx, listing.sellerId),
        this.transactionsService.getSellerCompletedSalesTotal(
          ctx,
          listing.sellerId,
        ),
        this.reviewsService.getSellerMetrics(ctx, listing.sellerId),
        this.paymentMethodsService.getPublicPaymentMethods(ctx),
        this.pricingService.createSnapshot(
          ctx,
          ticketId,
          listing.pricePerTicket,
        ),
      ]);

    const seller: BuyPageSellerInfo = {
      id: listing.sellerId,
      publicName: publicInfo?.publicName ?? 'Unknown',
      pic: publicInfo?.pic ?? {
        id: 'default',
        src: '/images/default/default.png',
      },
      badges: user?.level === UserLevel.VerifiedSeller ? ['verified'] : [],
      totalSales,
      percentPositiveReviews: sellerMetrics.positivePercent,
      totalReviews: sellerMetrics.totalReviews,
    };

    const pricingSnapshot: BuyPagePricingSnapshot = {
      id: snapshot.id,
      expiresAt: snapshot.expiresAt,
      buyerPlatformFeePercentage: snapshot.buyerPlatformFeePercentage,
    };

    const buyPagePaymentMethods: BuyPagePaymentMethodOption[] = paymentMethods.map(
      (pm) => ({
        id: pm.id,
        name: pm.name,
        buyerCommissionPercent: pm.buyerCommissionPercent,
      }),
    );

    return {
      listing,
      seller,
      paymentMethods: buyPagePaymentMethods,
      pricingSnapshot,
    };
  }

  /**
   * Get current user's tickets: bought, sold, and listed.
   */
  async getMyTickets(ctx: Ctx, userId: string): Promise<GetMyTicketsData> {
    const [bought, sold, listed] = await Promise.all([
      this.transactionsService.listTransactions(ctx, userId, { role: 'buyer' }),
      this.transactionsService.listTransactions(ctx, userId, {
        role: 'seller',
      }),
      this.ticketsService.getMyListings(ctx, userId),
    ]);
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
    if (transaction.paymentMethodId?.includes('bank_transfer')) {
      try {
        paymentConfirmation =
          await this.paymentConfirmationsService.getConfirmationByTransaction(
            ctx,
            transactionId,
            userId,
            userRole,
          );
      } catch {
        // No confirmation yet, that's fine
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
      } catch {
        // Failed to load reviews, user can still view transaction
      }
    }

    return {
      transaction,
      paymentConfirmation,
      reviews,
    };
  }
}
