import { Test, TestingModule } from '@nestjs/testing';
import { RiskEngineService } from '../../../../src/modules/risk-engine/risk-engine.service';
import { PlatformConfigService } from '../../../../src/modules/config/config.service';
import { UsersService } from '../../../../src/modules/users/users.service';
import { RiskLevel } from '../../../../src/modules/risk-engine/risk-engine.domain';
import { IdentityVerificationStatus } from '../../../../src/modules/users/users.domain';
import type { User } from '../../../../src/modules/users/users.domain';
import type { Ctx } from '../../../../src/common/types/context';

describe('RiskEngineService', () => {
  let service: RiskEngineService;
  let configService: jest.Mocked<PlatformConfigService>;
  let usersService: jest.Mocked<UsersService>;

  const mockCtx: Ctx = { source: 'HTTP', requestId: 'test-request-id' };

  const defaultBuyerConfig = {
    phoneRequiredEventHours: 72,
    phoneRequiredAmountUsd: 120,
    phoneRequiredQtyTickets: 2,
    newAccountDays: 7,
  };

  const sellerWithV3: User = {
    id: 'seller_1',
    email: 'seller@test.com',
    emailVerified: true,
    phoneVerified: true,
    acceptedSellerTermsAt: new Date(),
    identityVerification: { status: IdentityVerificationStatus.Approved },
  } as User;

  const sellerWithoutV3: User = {
    ...sellerWithV3,
    identityVerification: undefined,
  } as User;

  const baseInput = {
    quantity: 1,
    amountUsd: 50,
    eventStartsAt: new Date(Date.now() + 100 * 60 * 60 * 1000), // 100h from now
    buyerCreatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    seller: sellerWithV3,
    paymentMethodId: 'mercadopago',
  };

  beforeEach(async () => {
    const mockConfigService = {
      getPlatformConfig: jest.fn().mockResolvedValue({
        riskEngine: { buyer: defaultBuyerConfig },
      }),
    };

    const mockUsersService = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiskEngineService,
        { provide: PlatformConfigService, useValue: mockConfigService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<RiskEngineService>(RiskEngineService);
    configService = module.get(PlatformConfigService);
    usersService = module.get(UsersService);
  });

  describe('evaluate', () => {
    it('should return LOW risk and requireV2 false when no triggers fire', () => {
      const result = service.evaluate(baseInput, defaultBuyerConfig);

      expect(result.riskLevel).toBe(RiskLevel.LOW);
      expect(result.requireV1).toBe(true);
      expect(result.requireV2).toBe(false);
    });

    it('should require V2 when payment method is bank_transfer', () => {
      const result = service.evaluate(
        { ...baseInput, paymentMethodId: 'bank_transfer' },
        defaultBuyerConfig,
      );

      expect(result.requireV2).toBe(true);
      expect(result.riskLevel).toBe(RiskLevel.MED);
    });

    it('should require V2 when payment method contains "transfer"', () => {
      const result = service.evaluate(
        { ...baseInput, paymentMethodId: 'some_transfer_method' },
        defaultBuyerConfig,
      );

      expect(result.requireV2).toBe(true);
    });

    it('should require V2 when event is within configured hours', () => {
      const result = service.evaluate(
        {
          ...baseInput,
          eventStartsAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h from now
        },
        defaultBuyerConfig,
      );

      expect(result.requireV2).toBe(true);
      expect(result.riskLevel).toBe(RiskLevel.MED);
    });

    it('should require V2 when amount meets or exceeds threshold', () => {
      const result = service.evaluate(
        { ...baseInput, amountUsd: 120 },
        defaultBuyerConfig,
      );

      expect(result.requireV2).toBe(true);
    });

    it('should require V2 when quantity meets or exceeds threshold', () => {
      const result = service.evaluate(
        { ...baseInput, quantity: 2 },
        defaultBuyerConfig,
      );

      expect(result.requireV2).toBe(true);
    });

    it('should require V2 when buyer account is new (within newAccountDays)', () => {
      const result = service.evaluate(
        {
          ...baseInput,
          buyerCreatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        },
        defaultBuyerConfig,
      );

      expect(result.requireV2).toBe(true);
    });

    it('should require V2 when seller has no V3', () => {
      const result = service.evaluate(
        { ...baseInput, seller: sellerWithoutV3 },
        defaultBuyerConfig,
      );

      expect(result.requireV2).toBe(true);
      expect(result.riskLevel).toBe(RiskLevel.MED);
    });

    it('should use fallback config when buyerConfig is not provided', () => {
      const result = service.evaluate({
        ...baseInput,
        amountUsd: 200, // above default 120
      });

      expect(result.requireV2).toBe(true);
    });
  });

  describe('evaluateCheckoutRisk', () => {
    it('should return requireV2 true (HIGH) when buyer is not found', async () => {
      usersService.findById
        .mockResolvedValueOnce(null as any)
        .mockResolvedValueOnce(sellerWithV3);

      const result = await service.evaluateCheckoutRisk(
        mockCtx,
        'missing_buyer',
        {
          quantity: 1,
          amountUsd: 50,
          eventStartsAt: baseInput.eventStartsAt,
          paymentMethodId: 'mercadopago',
          sellerId: 'seller_1',
        },
      );

      expect(result.requireV1).toBe(true);
      expect(result.requireV2).toBe(true);
      expect(result.riskLevel).toBe(RiskLevel.HIGH);
    });

    it('should load buyer, seller and config and delegate to evaluate', async () => {
      const buyer: User = {
        id: 'buyer_1',
        email: 'buyer@test.com',
        emailVerified: true,
        phoneVerified: false,
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      } as User;

      usersService.findById
        .mockResolvedValueOnce(buyer)
        .mockResolvedValueOnce(sellerWithV3);

      const result = await service.evaluateCheckoutRisk(
        mockCtx,
        'buyer_1',
        {
          quantity: 1,
          amountUsd: 50,
          eventStartsAt: baseInput.eventStartsAt,
          paymentMethodId: 'mercadopago',
          sellerId: 'seller_1',
        },
      );

      expect(usersService.findById).toHaveBeenCalledWith(mockCtx, 'buyer_1');
      expect(usersService.findById).toHaveBeenCalledWith(mockCtx, 'seller_1');
      expect(configService.getPlatformConfig).toHaveBeenCalledWith(mockCtx);
      expect(result.requireV1).toBe(true);
      expect(result.requireV2).toBe(false);
    });

    it('should require V2 when seller has no V3 (from loaded seller)', async () => {
      const buyer: User = {
        id: 'buyer_1',
        email: 'buyer@test.com',
        emailVerified: true,
        phoneVerified: true,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      } as User;

      usersService.findById
        .mockResolvedValueOnce(buyer)
        .mockResolvedValueOnce(sellerWithoutV3);

      const result = await service.evaluateCheckoutRisk(
        mockCtx,
        'buyer_1',
        {
          quantity: 1,
          amountUsd: 50,
          eventStartsAt: baseInput.eventStartsAt,
          paymentMethodId: 'mercadopago',
          sellerId: 'seller_1',
        },
      );

      expect(result.requireV2).toBe(true);
    });
  });
});
