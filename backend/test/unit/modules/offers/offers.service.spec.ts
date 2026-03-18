import { Test, TestingModule } from '@nestjs/testing';
import { OffersService } from '../../../../src/modules/offers/offers.service';
import { OFFERS_REPOSITORY } from '../../../../src/modules/offers/offers.repository.interface';
import type { IOffersRepository } from '../../../../src/modules/offers/offers.repository.interface';
import { TicketsService } from '../../../../src/modules/tickets/tickets.service';
import { PlatformConfigService } from '../../../../src/modules/config/config.service';
import { NotificationsService } from '../../../../src/modules/notifications/notifications.service';
import { UsersService } from '../../../../src/modules/users/users.service';
import type { Offer } from '../../../../src/modules/offers/offers.domain';
import type { TicketListingWithEvent } from '../../../../src/modules/tickets/tickets.domain';
import type { User } from '../../../../src/modules/users/users.domain';
import type { Ctx } from '../../../../src/common/types/context';

const mockCtx: Ctx = { source: 'HTTP', requestId: 'test-request-id' };

describe('OffersService', () => {
  let service: OffersService;
  let offersRepository: jest.Mocked<IOffersRepository>;
  let ticketsService: jest.Mocked<TicketsService>;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const mockOffersRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByListingId: jest.fn(),
      findByListingIds: jest.fn(),
      findByUserId: jest.fn(),
      findActiveByUserAndListing: jest.fn(),
      update: jest.fn(),
      findPendingOrAcceptedByListingId: jest.fn(),
    };

    const mockTicketsService = {
      getListingById: jest.fn(),
      getListingsByIds: jest.fn(),
      getMyListings: jest.fn(),
    };

    const mockPlatformConfigService = {
      getPlatformConfig: jest.fn(),
    };

    const mockNotificationsService = {
      emit: jest.fn(),
    };

    const mockUsersService = {
      findById: jest.fn(),
      findByIds: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OffersService,
        { provide: OFFERS_REPOSITORY, useValue: mockOffersRepository },
        { provide: TicketsService, useValue: mockTicketsService },
        { provide: PlatformConfigService, useValue: mockPlatformConfigService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get(OffersService);
    offersRepository = module.get(OFFERS_REPOSITORY);
    ticketsService = module.get(TicketsService);
    usersService = module.get(UsersService);
  });

  describe('listMyOffers', () => {
    it('should return enriched offers with listingSummary', async () => {
      const offer: Offer = {
        id: 'off_1',
        listingId: 'listing_1',
        userId: 'user_1',
        offeredPrice: { amount: 10000, currency: 'EUR' },
        status: 'pending',
        tickets: { type: 'unnumbered', count: 2 },
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const listing: TicketListingWithEvent = {
        id: 'listing_1',
        sellerId: 'seller_1',
        eventId: 'ev_1',
        eventDateId: 'ed_1',
        type: 'Digital' as any,
        ticketUnits: [],
        sellTogether: true,
        pricePerTicket: { amount: 12000, currency: 'EUR' },
        eventSectionId: 'sec_1',
        status: 'Active' as any,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        seatingType: 'unnumbered' as any,
        eventName: 'Test Event',
        eventSlug: 'test-event-ev_1',
        eventDate: new Date('2025-06-14T20:00:00Z'),
        venue: 'Arena',
        sectionName: 'Section A',
        bannerUrls: { square: 'https://example.com/sq.jpg' },
      };

      const seller: User = {
        id: 'seller_1',
        email: 's@example.com',
        firstName: 'Maria',
        lastName: 'G.',
        role: 'User' as any,
        status: 'Active' as any,
        publicName: 'María G.',
        imageId: 'img_1',
        password: 'hashed',
        country: 'ES',
        currency: 'EUR' as any,
        language: 'es' as any,
        emailVerified: true,
        phoneVerified: false,
        buyerDisputed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      offersRepository.findByUserId.mockResolvedValue([offer]);
      ticketsService.getListingsByIds.mockResolvedValue([listing]);
      usersService.findByIds.mockResolvedValue([seller]);

      const result = await service.listMyOffers(mockCtx, 'user_1');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'off_1',
        listingId: 'listing_1',
        status: 'pending',
        listingSummary: {
          eventName: 'Test Event',
          sellerName: 'María G.',
          bannerUrls: { square: 'https://example.com/sq.jpg' },
        },
      });
      expect(result[0].listingSummary.eventDate).toBeDefined();
    });

    it('should return empty array when user has no offers', async () => {
      offersRepository.findByUserId.mockResolvedValue([]);

      const result = await service.listMyOffers(mockCtx, 'user_1');

      expect(result).toEqual([]);
      expect(ticketsService.getListingsByIds).not.toHaveBeenCalled();
      expect(usersService.findByIds).not.toHaveBeenCalled();
    });
  });

  describe('listReceivedOffers', () => {
    it('should return enriched offers with receivedContext for seller listings', async () => {
      const listing: TicketListingWithEvent = {
        id: 'listing_1',
        sellerId: 'seller_1',
        eventId: 'ev_1',
        eventDateId: 'ed_1',
        type: 'Digital' as any,
        ticketUnits: [],
        sellTogether: true,
        pricePerTicket: { amount: 15000, currency: 'EUR' },
        eventSectionId: 'sec_1',
        status: 'Active' as any,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        eventSlug: 'test-event-ev_1',
        seatingType: 'unnumbered' as any,
        eventName: 'Concert',
        eventDate: new Date('2025-07-01T19:00:00Z'),
        venue: 'Stadium',
        sectionName: 'GA',
        bannerUrls: { rectangle: 'https://example.com/rect.jpg' },
      };

      const offer: Offer = {
        id: 'off_1',
        listingId: 'listing_1',
        userId: 'buyer_1',
        offeredPrice: { amount: 12000, currency: 'EUR' },
        status: 'pending',
        tickets: { type: 'unnumbered', count: 2 },
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const buyer: User = {
        id: 'buyer_1',
        email: 'b@example.com',
        firstName: 'John',
        lastName: 'D.',
        role: 'User' as any,
        status: 'Active' as any,
        publicName: 'John D.',
        imageId: null,
        password: 'hashed',
        country: 'ES',
        currency: 'EUR' as any,
        language: 'en' as any,
        buyerDisputed: false,
        emailVerified: true,
        phoneVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      ticketsService.getMyListings.mockResolvedValue([listing]);
      offersRepository.findByListingIds.mockResolvedValue([offer]);
      usersService.findByIds.mockResolvedValue([buyer]);

      const result = await service.listReceivedOffers(mockCtx, 'seller_1');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'off_1',
        listingId: 'listing_1',
        status: 'pending',
        receivedContext: {
          listingId: 'listing_1',
          eventName: 'Concert',
          sectionName: 'GA',
          listingPrice: { amount: 15000, currency: 'EUR' },
          buyerName: 'John D.',
          bannerUrls: { rectangle: 'https://example.com/rect.jpg' },
        },
      });
      expect(ticketsService.getMyListings).toHaveBeenCalledWith(
        mockCtx,
        'seller_1',
      );
      expect(offersRepository.findByListingIds).toHaveBeenCalledWith(mockCtx, [
        'listing_1',
      ]);
    });

    it('should return empty array when seller has no listings', async () => {
      ticketsService.getMyListings.mockResolvedValue([]);

      const result = await service.listReceivedOffers(mockCtx, 'seller_1');

      expect(result).toEqual([]);
      expect(offersRepository.findByListingIds).not.toHaveBeenCalled();
    });
  });
});
