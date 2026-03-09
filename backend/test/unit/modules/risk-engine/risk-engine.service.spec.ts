import { Test, TestingModule } from '@nestjs/testing';
import {
  RiskEngineService,
  type RiskEngineBuyerConfigInput,
} from '../../../../src/modules/risk-engine/risk-engine.service';
import { PlatformConfigService } from '../../../../src/modules/config/config.service';
import { ConversionService } from '../../../../src/modules/config/conversion.service';
import { UsersService } from '../../../../src/modules/users/users.service';
import { RiskLevel } from '../../../../src/modules/risk-engine/risk-engine.domain';
import { IdentityVerificationStatus } from '../../../../src/modules/users/users.domain';
import type { User } from '../../../../src/modules/users/users.domain';
import type { Ctx } from '../../../../src/common/types/context';
import { ConfigService as NestConfigService } from '@nestjs/config';

describe('RiskEngineService', () => {
  let service: RiskEngineService;
  let configService: jest.Mocked<PlatformConfigService>;
  let usersService: jest.Mocked<UsersService>;

  const mockCtx: Ctx = { source: 'HTTP', requestId: 'test-request-id' };

  const defaultBuyerConfig: RiskEngineBuyerConfigInput = {
    phoneRequiredEventHours: 72,
    phoneRequiredAmount: { amount: 12000, currency: 'USD' }, // 120 USD
    phoneRequiredQtyTickets: 2,
    newAccountDays: 7,
    phoneRequiredPaymentMethodTypes: ['manual_approval'],
    dniRequiredEventHours: 24,
    dniRequiredAmount: { amount: 25000, currency: 'USD' }, // 250 USD
    dniRequiredQtyTickets: 4,
    dniNewAccountDays: 3,
    dniRequiredPaymentMethodTypes: [],
  };

  const hoconBuyerMap: Record<string, number> = {
    'platform.riskEngine.buyer.phoneRequiredEventHours': 72,
    'platform.riskEngine.buyer.phoneRequiredAmountUsd': 120,
    'platform.riskEngine.buyer.phoneRequiredQtyTickets': 2,
    'platform.riskEngine.buyer.newAccountDays': 7,
    'platform.riskEngine.buyer.dniRequiredEventHours': 24,
    'platform.riskEngine.buyer.dniRequiredAmountUsd': 250,
    'platform.riskEngine.buyer.dniRequiredQtyTickets': 4,
    'platform.riskEngine.buyer.dniNewAccountDays': 3,
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

  /** 50 USD in minor units */
  const baseInput = {
    quantity: 1,
    amount: { amount: 5000, currency: 'USD' as const },
    eventStartsAt: new Date(Date.now() + 100 * 60 * 60 * 1000), // 100h from now
    buyerCreatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    seller: sellerWithV3,
    paymentMethodType: undefined as undefined,
  };

  beforeEach(async () => {
    const mockConfigService = {
      getPlatformConfig: jest.fn().mockResolvedValue({
        riskEngine: { buyer: defaultBuyerConfig },
      }),
    };

    const mockConversionService = {
      convert: jest
        .fn()
        .mockImplementation(
          async (
            _ctx,
            money: { amount: number; currency: string },
            toCurrency: string,
          ) => {
            if (money.currency === toCurrency) return money;
            if (money.currency === 'USD' && toCurrency === 'USD') return money;
            if (money.currency === 'ARS' && toCurrency === 'USD') {
              return {
                amount: Math.round(money.amount / 1000),
                currency: 'USD' as const,
              };
            }
            return money;
          },
        ),
    };

    const mockUsersService = {
      findById: jest.fn(),
    };

    const mockNestConfig = {
      get: jest.fn((key: string) => hoconBuyerMap[key]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiskEngineService,
        { provide: PlatformConfigService, useValue: mockConfigService },
        { provide: ConversionService, useValue: mockConversionService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: NestConfigService, useValue: mockNestConfig },
      ],
    }).compile();

    service = module.get<RiskEngineService>(RiskEngineService);
    configService = module.get(PlatformConfigService);
    usersService = module.get(UsersService);
  });

  describe('evaluate', () => {
    it('should return LOW risk and requireV2/requireV3 false when no triggers fire', async () => {
      const result = await service.evaluate(
        mockCtx,
        baseInput,
        defaultBuyerConfig,
      );

      expect(result.riskLevel).toBe(RiskLevel.LOW);
      expect(result.requireV1).toBe(true);
      expect(result.requireV2).toBe(false);
      expect(result.requireV3).toBe(false);
    });

    it('should require V2 only (no V3) when payment method type is manual_approval', async () => {
      const result = await service.evaluate(
        mockCtx,
        { ...baseInput, paymentMethodType: 'manual_approval' as const },
        defaultBuyerConfig,
      );

      expect(result.requireV2).toBe(true);
      expect(result.requireV3).toBe(false);
      expect(result.riskLevel).toBe(RiskLevel.MED);
    });

    it('should not require V2 when payment method type is payment_gateway', async () => {
      const result = await service.evaluate(
        mockCtx,
        { ...baseInput, paymentMethodType: 'payment_gateway' as const },
        defaultBuyerConfig,
      );

      expect(result.requireV2).toBe(false);
      expect(result.requireV3).toBe(false);
    });

    it('should require V2+V3 when event is within DNI hours (e.g. 24h)', async () => {
      const result = await service.evaluate(
        mockCtx,
        {
          ...baseInput,
          eventStartsAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12h from now, within dni 24h
        },
        defaultBuyerConfig,
      );

      expect(result.requireV2).toBe(true);
      expect(result.requireV3).toBe(true);
      expect(result.riskLevel).toBe(RiskLevel.MED);
    });

    it('should require V2 only when event is within phone hours but beyond DNI hours', async () => {
      const result = await service.evaluate(
        mockCtx,
        {
          ...baseInput,
          eventStartsAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h from now (within 72h, not 24h)
        },
        defaultBuyerConfig,
      );

      expect(result.requireV2).toBe(true);
      expect(result.requireV3).toBe(false);
      expect(result.riskLevel).toBe(RiskLevel.MED);
    });

    it('should require V2+V3 when amount meets DNI threshold (250 USD)', async () => {
      const result = await service.evaluate(
        mockCtx,
        { ...baseInput, amount: { amount: 25000, currency: 'USD' } },
        defaultBuyerConfig,
      );

      expect(result.requireV2).toBe(true);
      expect(result.requireV3).toBe(true);
    });

    it('should require V2 only when amount meets phone threshold but not DNI (120 USD)', async () => {
      const result = await service.evaluate(
        mockCtx,
        { ...baseInput, amount: { amount: 12000, currency: 'USD' } },
        defaultBuyerConfig,
      );

      expect(result.requireV2).toBe(true);
      expect(result.requireV3).toBe(false);
    });

    it('should require V2+V3 when quantity meets DNI threshold (4)', async () => {
      const result = await service.evaluate(
        mockCtx,
        { ...baseInput, quantity: 4 },
        defaultBuyerConfig,
      );

      expect(result.requireV2).toBe(true);
      expect(result.requireV3).toBe(true);
    });

    it('should require V2 only when quantity meets phone threshold but not DNI (2)', async () => {
      const result = await service.evaluate(
        mockCtx,
        { ...baseInput, quantity: 2 },
        defaultBuyerConfig,
      );

      expect(result.requireV2).toBe(true);
      expect(result.requireV3).toBe(false);
    });

    it('should require V2+V3 when buyer account is very new (within dniNewAccountDays)', async () => {
      const result = await service.evaluate(
        mockCtx,
        {
          ...baseInput,
          buyerCreatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago, within dni 3
        },
        defaultBuyerConfig,
      );

      expect(result.requireV2).toBe(true);
      expect(result.requireV3).toBe(true);
    });

    it('should require V2 only when buyer account is new but beyond DNI days (e.g. 5 days)', async () => {
      const result = await service.evaluate(
        mockCtx,
        {
          ...baseInput,
          buyerCreatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        },
        defaultBuyerConfig,
      );

      expect(result.requireV2).toBe(true);
      expect(result.requireV3).toBe(false);
    });

    it('should require V2 only when seller has no V3 (no DNI condition for seller)', async () => {
      const result = await service.evaluate(
        mockCtx,
        { ...baseInput, seller: sellerWithoutV3 },
        defaultBuyerConfig,
      );

      expect(result.requireV2).toBe(true);
      expect(result.requireV3).toBe(false);
      expect(result.riskLevel).toBe(RiskLevel.MED);
    });

    it('should use fallback config when buyerConfig is not provided', async () => {
      const result = await service.evaluate(mockCtx, {
        ...baseInput,
        amount: { amount: 20000, currency: 'USD' }, // 200 USD, above default 120, triggers phone
      });

      expect(result.requireV2).toBe(true);
      expect(result.requireV3).toBe(false);
    });
  });

  describe('evaluateCheckoutRisk', () => {
    it('should return requireV2 and requireV3 true (HIGH) when buyer is not found', async () => {
      usersService.findById
        .mockResolvedValueOnce(null as any)
        .mockResolvedValueOnce(sellerWithV3);

      const result = await service.evaluateCheckoutRisk(
        mockCtx,
        'missing_buyer',
        {
          quantity: 1,
          amount: { amount: 5000, currency: 'USD' },
          eventStartsAt: baseInput.eventStartsAt,
          sellerId: 'seller_1',
        },
      );

      expect(result.requireV1).toBe(true);
      expect(result.requireV2).toBe(true);
      expect(result.requireV3).toBe(true);
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

      const result = await service.evaluateCheckoutRisk(mockCtx, 'buyer_1', {
        quantity: 1,
        amount: { amount: 5000, currency: 'USD' },
        eventStartsAt: baseInput.eventStartsAt,
        sellerId: 'seller_1',
      });

      expect(usersService.findById).toHaveBeenCalledWith(mockCtx, 'buyer_1');
      expect(usersService.findById).toHaveBeenCalledWith(mockCtx, 'seller_1');
      expect(configService.getPlatformConfig).toHaveBeenCalledWith(mockCtx);
      expect(result.requireV1).toBe(true);
      expect(result.requireV2).toBe(false);
      expect(result.requireV3).toBe(false);
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

      const result = await service.evaluateCheckoutRisk(mockCtx, 'buyer_1', {
        quantity: 1,
        amount: { amount: 5000, currency: 'USD' },
        eventStartsAt: baseInput.eventStartsAt,
        sellerId: 'seller_1',
      });

      expect(result.requireV2).toBe(true);
      expect(result.requireV3).toBe(false);
    });
  });
});
