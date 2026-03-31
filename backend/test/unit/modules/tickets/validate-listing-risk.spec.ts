import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from '../../../../src/modules/tickets/tickets.service';
import { TICKETS_REPOSITORY } from '../../../../src/modules/tickets/tickets.repository.interface';
import { EventsService } from '../../../../src/modules/events/events.service';
import { TransactionManager } from '../../../../src/common/database';
import { UsersService } from '../../../../src/modules/users/users.service';
import { PromotionsService } from '../../../../src/modules/promotions/promotions.service';
import { PromotionCodesService } from '../../../../src/modules/promotions/promotion-codes.service';
import { TermsService } from '../../../../src/modules/terms/terms.service';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { PlatformConfigService } from '../../../../src/modules/config/config.service';
import { ConversionService } from '../../../../src/modules/config/conversion.service';
import { EventScoringService } from '../../../../src/modules/event-scoring/event-scoring.service';
import { IdentityVerificationStatus } from '../../../../src/modules/users/users.domain';
import { ListingStatus } from '../../../../src/modules/tickets/tickets.domain';
import type { Ctx } from '../../../../src/common/types/context';
import type { CurrencyCode } from '../../../../src/modules/shared/money.domain';

describe('TicketsService.validateListingRisk', () => {
  let service: TicketsService;
  let usersService: jest.Mocked<Pick<UsersService, 'findById'>>;
  let configService: jest.Mocked<Pick<PlatformConfigService, 'getPlatformConfig'>>;
  let conversionService: jest.Mocked<Pick<ConversionService, 'sumInCurrency'>>;
  let ticketsRepository: { getBySellerId: jest.Mock; getActiveListingsSummaryBySellerId: jest.Mock };

  const mockCtx: Ctx = { source: 'HTTP', requestId: 'test-req' };

  const pricePerTicket = { amount: 1000, currency: 'USD' as CurrencyCode };

  /** A user that can sell but is NOT fully verified (UNVERIFIED_SELLER tier). */
  const unverifiedSeller = {
    id: 'seller_unverified',
    emailVerified: true,
    phoneVerified: true,
    acceptedSellerTermsAt: new Date(),
    // no identityVerification approved, no bankAccount verified => UNVERIFIED_SELLER
    identityVerification: { status: IdentityVerificationStatus.Pending },
    bankAccount: null,
  };

  /** A user that is fully verified (VERIFIED_SELLER tier). */
  const verifiedSeller = {
    id: 'seller_verified',
    emailVerified: true,
    phoneVerified: true,
    acceptedSellerTermsAt: new Date(),
    identityVerification: { status: IdentityVerificationStatus.Approved },
    bankAccount: { verified: true },
  };

  const defaultPlatformConfig = {
    riskEngine: {
      buyer: {
        phoneRequiredEventHours: 72,
      },
      seller: {
        unverifiedSellerMaxSales: 5,
        unverifiedSellerMaxAmount: { amount: 20000, currency: 'USD' },
      },
    },
  };

  beforeEach(async () => {
    ticketsRepository = {
      getBySellerId: jest.fn().mockResolvedValue([]),
      getActiveListingsSummaryBySellerId: jest.fn().mockResolvedValue([]),
    };

    const mockUsersService = {
      findById: jest.fn(),
    };

    const mockConfigService = {
      getPlatformConfig: jest.fn().mockResolvedValue(defaultPlatformConfig),
    };

    const mockConversionService = {
      sumInCurrency: jest
        .fn()
        .mockResolvedValue({ amount: 0, currency: 'USD' }),
    };

    const mockNestConfig = {
      get: jest.fn((key: string) =>
        key === 'platform.riskEngine.buyer.phoneRequiredEventHours'
          ? 72
          : undefined,
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: TICKETS_REPOSITORY, useValue: ticketsRepository },
        { provide: EventsService, useValue: { getEventById: jest.fn() } },
        { provide: UsersService, useValue: mockUsersService },
        { provide: TransactionManager, useValue: { executeInTransaction: jest.fn(), getClient: jest.fn() } },
        { provide: PromotionsService, useValue: { getActiveForUser: jest.fn(), toSnapshot: jest.fn(), incrementUsedAndAddListingId: jest.fn() } },
        { provide: PromotionCodesService, useValue: { getActiveForUser: jest.fn(), incrementUsedAndAddListingId: jest.fn() } },
        { provide: TermsService, useValue: { hasAcceptedCurrentTerms: jest.fn() } },
        { provide: PlatformConfigService, useValue: mockConfigService },
        { provide: ConversionService, useValue: mockConversionService },
        { provide: NestConfigService, useValue: mockNestConfig },
        { provide: EventScoringService, useValue: { requestScoring: jest.fn() } },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
    usersService = module.get(UsersService);
    configService = module.get(PlatformConfigService);
    conversionService = module.get(ConversionService);
  });

  describe('VERIFIED_SELLER fast path', () => {
    it('returns can_create for VERIFIED_SELLER regardless of validations', async () => {
      (usersService.findById as jest.Mock).mockResolvedValue(verifiedSeller);

      const result = await service.validateListingRisk(mockCtx, verifiedSeller.id, {
        quantity: 10,
        pricePerTicket,
        validations: ['proximity', 'limits'],
        eventStartsAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour away — would trigger proximity if checked
      });

      expect(result).toEqual({ status: 'can_create' });
      // Should not touch config or repository for a verified seller
      expect(configService.getPlatformConfig).not.toHaveBeenCalled();
    });
  });

  describe('proximity validation', () => {
    beforeEach(() => {
      (usersService.findById as jest.Mock).mockResolvedValue(unverifiedSeller);
    });

    it('returns date_proximity_restriction when event is within the configured hours window', async () => {
      // 24 hours from now, inside 72-hour window
      const eventStartsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const result = await service.validateListingRisk(mockCtx, unverifiedSeller.id, {
        quantity: 1,
        pricePerTicket,
        validations: ['proximity'],
        eventStartsAt,
      });

      expect(result).toEqual({ status: 'date_proximity_restriction' });
    });

    it('returns can_create when event is outside the configured hours window', async () => {
      // 96 hours from now, outside 72-hour window
      const eventStartsAt = new Date(Date.now() + 96 * 60 * 60 * 1000);

      const result = await service.validateListingRisk(mockCtx, unverifiedSeller.id, {
        quantity: 1,
        pricePerTicket,
        validations: ['proximity'],
        eventStartsAt,
      });

      expect(result).toEqual({ status: 'can_create' });
      expect(conversionService.sumInCurrency).not.toHaveBeenCalled();
    });

    it('skips proximity check when validations only includes limits', async () => {
      // Event is only 1 hour away — would trigger proximity if checked
      const eventStartsAt = new Date(Date.now() + 1 * 60 * 60 * 1000);

      const result = await service.validateListingRisk(mockCtx, unverifiedSeller.id, {
        quantity: 1,
        pricePerTicket,
        validations: ['limits'],
        eventStartsAt,
      });

      // limits check passes (totals are 0), so should be can_create
      expect(result).toEqual({ status: 'can_create' });
    });

    it('skips proximity check when validations includes proximity but eventStartsAt is absent', async () => {
      const result = await service.validateListingRisk(mockCtx, unverifiedSeller.id, {
        quantity: 1,
        pricePerTicket,
        validations: ['proximity'],
        // eventStartsAt omitted intentionally
      });

      expect(result).toEqual({ status: 'can_create' });
    });
  });

  describe('limits validation', () => {
    beforeEach(() => {
      (usersService.findById as jest.Mock).mockResolvedValue(unverifiedSeller);
    });

    it('returns listing_limits_restriction when total value exceeds the cap', async () => {
      // Active listings already sum to 19500 USD; new listing adds 1000 => 20500 > 20000 cap
      (conversionService.sumInCurrency as jest.Mock).mockResolvedValue({
        amount: 20500,
        currency: 'USD',
      });

      const result = await service.validateListingRisk(mockCtx, unverifiedSeller.id, {
        quantity: 1,
        pricePerTicket,
        validations: ['limits'],
      });

      expect(result).toEqual({ status: 'listing_limits_restriction' });
    });

    it('returns can_create when total value is within the cap', async () => {
      (conversionService.sumInCurrency as jest.Mock).mockResolvedValue({
        amount: 5000,
        currency: 'USD',
      });

      const result = await service.validateListingRisk(mockCtx, unverifiedSeller.id, {
        quantity: 1,
        pricePerTicket,
        validations: ['limits'],
      });

      expect(result).toEqual({ status: 'can_create' });
    });

    it('skips limits check when validations only includes proximity (event outside window)', async () => {
      const farFuture = new Date(Date.now() + 200 * 60 * 60 * 1000); // 200h, outside 72h window
      const result = await service.validateListingRisk(mockCtx, unverifiedSeller.id, {
        quantity: 10,
        pricePerTicket: { amount: 999999, currency: 'ARS' },
        validations: ['proximity'],
        eventStartsAt: farFuture,
      });
      expect(result).toEqual({ status: 'can_create' });
      expect(conversionService.sumInCurrency).not.toHaveBeenCalled();
    });
  });

  describe('canSell gate', () => {
    it('throws ForbiddenException when user is not found', async () => {
      (usersService.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.validateListingRisk(mockCtx, 'unknown_seller', {
          quantity: 1,
          pricePerTicket,
          validations: ['limits'],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when user cannot sell (missing phone verification)', async () => {
      (usersService.findById as jest.Mock).mockResolvedValue({
        ...unverifiedSeller,
        phoneVerified: false,
      });

      await expect(
        service.validateListingRisk(mockCtx, unverifiedSeller.id, {
          quantity: 1,
          pricePerTicket,
          validations: ['limits'],
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('active listings count limit', () => {
    beforeEach(() => {
      (usersService.findById as jest.Mock).mockResolvedValue(unverifiedSeller);
    });

    it('returns listing_limits_restriction when seller already has max active listings', async () => {
      // Return enough active listing prices to exceed count cap (max is 5 per config)
      const activePrices = Array.from({ length: 5 }, () => ({
        amount: 100,
        currency: 'USD',
      }));
      ticketsRepository.getActiveListingsSummaryBySellerId.mockResolvedValue(activePrices);

      // Even though the sum is fine, count (5 existing + 1 new = 6 > 5) triggers the limit
      (conversionService.sumInCurrency as jest.Mock).mockResolvedValue({
        amount: 100,
        currency: 'USD',
      });

      const result = await service.validateListingRisk(mockCtx, unverifiedSeller.id, {
        quantity: 1,
        pricePerTicket,
        validations: ['limits'],
      });

      expect(result).toEqual({ status: 'listing_limits_restriction' });
    });
  });
});
