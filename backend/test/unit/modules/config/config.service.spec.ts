import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformConfigService } from '../../../../src/modules/config/config.service';
import { CONFIG_REPOSITORY } from '../../../../src/modules/config/config.repository.interface';
import type { IConfigRepository } from '../../../../src/modules/config/config.repository.interface';
import { ConfigService as NestConfigService } from '@nestjs/config';
import type { Ctx } from '../../../../src/common/types/context';

describe('PlatformConfigService', () => {
  let service: PlatformConfigService;
  let configRepository: jest.Mocked<IConfigRepository>;

  const mockCtx: Ctx = { source: 'HTTP', requestId: 'test-request-id' };

  const defaultConfig = {
    buyerPlatformFeePercentage: 10,
    sellerPlatformFeePercentage: 5,
    paymentTimeoutMinutes: 10,
    adminReviewTimeoutHours: 24,
    offerPendingExpirationMinutes: 1440,
    offerAcceptedExpirationMinutes: 1440,
    transactionChatPollIntervalSeconds: 15,
    transactionChatMaxMessages: 100,
    riskEngine: {
      buyer: {
        phoneRequiredEventHours: 72,
        phoneRequiredAmount: { amount: 12000, currency: 'USD' as const },
        phoneRequiredQtyTickets: 2,
        newAccountDays: 7,
        phoneRequiredPaymentMethodTypes: ['manual_approval'],
        dniRequiredEventHours: 24,
        dniRequiredAmount: { amount: 25000, currency: 'USD' as const },
        dniRequiredQtyTickets: 4,
        dniNewAccountDays: 3,
        dniRequiredPaymentMethodTypes: [],
      },
      seller: {
        unverifiedSellerMaxSales: 2,
        unverifiedSellerMaxAmount: { amount: 20000, currency: 'USD' as const },
        payoutHoldHoursDefault: 24,
        payoutHoldHoursUnverified: 48,
      },
      claims: {
        ticketNotReceived: { minimumClaimHours: 1, maximumClaimHours: 168 },
        ticketDidntWork: { minimumClaimHours: 1, maximumClaimHours: 168 },
      },
    },
    exchangeRates: { usdToArs: 1000 },
  };

  const hoconMap: Record<string, number> = {
    'platform.buyerPlatformFeePercentage': 10,
    'platform.sellerPlatformFeePercentage': 5,
    'platform.paymentTimeoutMinutes': 10,
    'platform.adminReviewTimeoutHours': 24,
    'platform.offerPendingExpirationMinutes': 1440,
    'platform.offerAcceptedExpirationMinutes': 1440,
    'platform.transactionChatPollIntervalSeconds': 15,
    'platform.transactionChatMaxMessages': 100,
    'platform.riskEngine.buyer.phoneRequiredEventHours': 72,
    'platform.riskEngine.buyer.phoneRequiredAmountUsd': 120,
    'platform.riskEngine.buyer.phoneRequiredQtyTickets': 2,
    'platform.riskEngine.buyer.newAccountDays': 7,
    'platform.riskEngine.buyer.dniRequiredEventHours': 24,
    'platform.riskEngine.buyer.dniRequiredAmountUsd': 250,
    'platform.riskEngine.buyer.dniRequiredQtyTickets': 4,
    'platform.riskEngine.buyer.dniNewAccountDays': 3,
    'platform.riskEngine.seller.unverifiedSellerMaxSales': 2,
    'platform.riskEngine.seller.unverifiedSellerMaxAmountUsd': 200,
    'platform.riskEngine.seller.payoutHoldHoursDefault': 24,
    'platform.riskEngine.seller.payoutHoldHoursUnverified': 48,
    'platform.riskEngine.claims.ticketNotReceived.minimumClaimHours': 1,
    'platform.riskEngine.claims.ticketNotReceived.maximumClaimHours': 168,
    'platform.riskEngine.claims.ticketDidntWork.minimumClaimHours': 1,
    'platform.riskEngine.claims.ticketDidntWork.maximumClaimHours': 168,
    'platform.exchangeRates.usdToArs': 1000,
  };

  beforeEach(async () => {
    const mockRepository = {
      findPlatformConfig: jest.fn().mockResolvedValue(defaultConfig),
      upsertPlatformConfig: jest.fn().mockImplementation(async (_, c) => c),
    };

    const mockNestConfig = {
      get: jest.fn((key: string) => hoconMap[key]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformConfigService,
        { provide: CONFIG_REPOSITORY, useValue: mockRepository },
        { provide: NestConfigService, useValue: mockNestConfig },
      ],
    }).compile();

    service = module.get<PlatformConfigService>(PlatformConfigService);
    configRepository = module.get(CONFIG_REPOSITORY);
    void module.get(NestConfigService);
  });

  describe('getPlatformConfig', () => {
    it('should return config from repository when present', async () => {
      const result = await service.getPlatformConfig(mockCtx);
      expect(result).toEqual(defaultConfig);
      expect(configRepository.findPlatformConfig).toHaveBeenCalledWith(mockCtx);
      expect(configRepository.upsertPlatformConfig).not.toHaveBeenCalled();
    });

    it('should seed from HOCON and upsert when no row exists', async () => {
      configRepository.findPlatformConfig.mockResolvedValue(null);
      const result = await service.getPlatformConfig(mockCtx);
      expect(result).toMatchObject({
        buyerPlatformFeePercentage: 10,
        riskEngine: {
          buyer: { phoneRequiredEventHours: 72 },
          seller: {},
          claims: {},
        },
        exchangeRates: { usdToArs: 1000 },
      });
      expect(configRepository.upsertPlatformConfig).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          buyerPlatformFeePercentage: 10,
          exchangeRates: { usdToArs: 1000 },
        }),
      );
    });
  });

  describe('updatePlatformConfig', () => {
    it('should merge partial update with current config and upsert', async () => {
      const result = await service.updatePlatformConfig(mockCtx, {
        buyerPlatformFeePercentage: 15,
      });
      expect(result.buyerPlatformFeePercentage).toBe(15);
      expect(result.sellerPlatformFeePercentage).toBe(5);
      expect(result.paymentTimeoutMinutes).toBe(10);
      expect(result.adminReviewTimeoutHours).toBe(24);
      expect(result.offerPendingExpirationMinutes).toBe(1440);
      expect(result.offerAcceptedExpirationMinutes).toBe(1440);
      expect(result.transactionChatPollIntervalSeconds).toBe(15);
      expect(result.transactionChatMaxMessages).toBe(100);
      expect(configRepository.upsertPlatformConfig).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({ buyerPlatformFeePercentage: 15 }),
      );
    });

    it('should throw when buyer fee is out of range', async () => {
      await expect(
        service.updatePlatformConfig(mockCtx, {
          buyerPlatformFeePercentage: 101,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when seller fee is out of range', async () => {
      await expect(
        service.updatePlatformConfig(mockCtx, {
          sellerPlatformFeePercentage: -1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when transactionChatPollIntervalSeconds is out of range', async () => {
      await expect(
        service.updatePlatformConfig(mockCtx, {
          transactionChatPollIntervalSeconds: 200,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when transactionChatMaxMessages is out of range', async () => {
      await expect(
        service.updatePlatformConfig(mockCtx, {
          transactionChatMaxMessages: 5,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
