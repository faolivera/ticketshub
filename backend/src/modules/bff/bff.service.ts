import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { TransactionsService } from '../transactions/transactions.service';
import { TicketsService } from '../tickets/tickets.service';
import { TicketUnitStatus } from '../tickets/tickets.domain';
import type { Ctx } from '../../common/types/context';
import type { GetMyTicketsData } from './bff.api';
import type { SellerProfile, ListingWithSeller } from './bff.domain';

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
