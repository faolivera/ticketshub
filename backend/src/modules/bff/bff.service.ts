import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { TransactionsService } from '../transactions/transactions.service';
import { TicketsService } from '../tickets/tickets.service';
import { TicketUnitStatus } from '../tickets/tickets.domain';
import { UserLevel } from '../users/users.domain';
import type { Ctx } from '../../common/types/context';
import type { GetMyTicketsData } from './bff.api';
import type { SellerProfile, ListingWithSeller, BuyPageData, BuyPageSellerInfo, PaymentMethodOption } from './bff.domain';

@Injectable()
export class BffService {
  constructor(
    @Inject(UsersService)
    private readonly usersService: UsersService,
    @Inject(TransactionsService)
    private readonly transactionsService: TransactionsService,
    @Inject(TicketsService)
    private readonly ticketsService: TicketsService,
  ) {}

  /**
   * Get event listings enriched with seller public info.
   * Only returns active listings with available tickets.
   */
  async getEventListings(ctx: Ctx, eventId: string): Promise<ListingWithSeller[]> {
    const listings = await this.ticketsService.listListings(ctx, { eventId });
    const activeListings = listings.filter(
      (l) =>
        l.status === 'Active' &&
        l.ticketUnits.some((unit) => unit.status === TicketUnitStatus.Available),
    );

    const uniqueSellerIds = [...new Set(activeListings.map((l) => l.sellerId))];
    const sellers = await this.usersService.getPublicUserInfoByIds(ctx, uniqueSellerIds);
    const sellersMap = new Map(sellers.map((s) => [s.id, s]));

    return activeListings.map((listing) => {
      const seller = sellersMap.get(listing.sellerId);
      return {
        ...listing,
        sellerPublicName: seller?.publicName ?? 'Unknown',
        sellerPic: seller?.pic ?? { id: 'default', src: '/images/default/default.png' },
      };
    });
  }

  async getSellerProfile(ctx: Ctx, sellerId: string): Promise<SellerProfile> {
    const user = await this.usersService.findById(ctx, sellerId);
    if (!user) {
      throw new NotFoundException('Seller not found');
    }

    const [publicInfo] = await this.usersService.getPublicUserInfoByIds(ctx, [sellerId]);
    if (!publicInfo) {
      throw new NotFoundException('Seller not found');
    }

    const totalSales = await this.transactionsService.getSellerCompletedSalesTotal(ctx, sellerId);

    return {
      id: sellerId,
      publicName: publicInfo.publicName,
      pic: publicInfo.pic,
      memberSince: new Date(user.createdAt).toISOString(),
      totalSales,
      reviewStats: {
        positive: 0,
        neutral: 0,
        negative: 0,
      },
      reviews: [],
    };
  }

  /** Static payment methods for buy page */
  private static readonly BUY_PAGE_PAYMENT_METHODS: PaymentMethodOption[] = [
    { id: 'payway', name: 'Payway', commissionPercent: 7, type: 'webhook_integrated' },
    { id: 'mercadopago', name: 'MercadoPago', commissionPercent: 8, type: 'webhook_integrated' },
    { id: 'uala_bis_debito', name: 'Uala Bis Debito', commissionPercent: 5, type: 'webhook_integrated' },
    { id: 'bank_transfer', name: 'Transferencia Bancaria', commissionPercent: null, type: 'manual_approval' },
  ];

  /**
   * Get buy page data: listing, seller info, and payment methods.
   */
  async getBuyPageData(ctx: Ctx, ticketId: string): Promise<BuyPageData> {
    const listing = await this.ticketsService.getListingById(ctx, ticketId);
    const [publicInfo] = await this.usersService.getPublicUserInfoByIds(ctx, [listing.sellerId]);
    const user = await this.usersService.findById(ctx, listing.sellerId);
    const totalSales = await this.transactionsService.getSellerCompletedSalesTotal(ctx, listing.sellerId);

    const seller: BuyPageSellerInfo = {
      id: listing.sellerId,
      publicName: publicInfo?.publicName ?? 'Unknown',
      pic: publicInfo?.pic ?? { id: 'default', src: '/images/default/default.png' },
      badges: user?.level === UserLevel.VerifiedSeller ? ['verified'] : [],
      totalSales,
      // TODO: Implement seller reviews; return mock values until review system exists
      percentPositiveReviews: null,
      totalReviews: 0,
    };

    return {
      listing,
      seller,
      paymentMethods: BffService.BUY_PAGE_PAYMENT_METHODS,
    };
  }

  /**
   * Get current user's tickets: bought, sold, and listed.
   */
  async getMyTickets(ctx: Ctx, userId: string): Promise<GetMyTicketsData> {
    const [bought, sold, listed] = await Promise.all([
      this.transactionsService.listTransactions(ctx, userId, { role: 'buyer' }),
      this.transactionsService.listTransactions(ctx, userId, { role: 'seller' }),
      this.ticketsService.getMyListings(ctx, userId),
    ]);
    return { bought, sold, listed };
  }
}
