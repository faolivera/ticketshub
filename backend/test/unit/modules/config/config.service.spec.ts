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
  let nestConfigService: jest.Mocked<NestConfigService>;

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
  };

  beforeEach(async () => {
    const mockRepository = {
      findPlatformConfig: jest.fn().mockResolvedValue(defaultConfig),
      upsertPlatformConfig: jest.fn().mockImplementation(async (_, c) => c),
    };

    const mockNestConfig = {
      get: jest.fn((key: string) => {
        const map: Record<string, number> = {
          'platform.buyerPlatformFeePercentage': 10,
          'platform.sellerPlatformFeePercentage': 5,
          'platform.paymentTimeoutMinutes': 10,
          'platform.adminReviewTimeoutHours': 24,
          'platform.offerPendingExpirationMinutes': 1440,
          'platform.offerAcceptedExpirationMinutes': 1440,
          'platform.transactionChatPollIntervalSeconds': 15,
          'platform.transactionChatMaxMessages': 100,
        };
        return map[key];
      }),
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
    nestConfigService = module.get(NestConfigService);
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
      expect(result).toEqual(defaultConfig);
      expect(configRepository.upsertPlatformConfig).toHaveBeenCalledWith(
        mockCtx,
        defaultConfig
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
        expect.objectContaining({ buyerPlatformFeePercentage: 15 })
      );
    });

    it('should throw when buyer fee is out of range', async () => {
      await expect(
        service.updatePlatformConfig(mockCtx, {
          buyerPlatformFeePercentage: 101,
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when seller fee is out of range', async () => {
      await expect(
        service.updatePlatformConfig(mockCtx, {
          sellerPlatformFeePercentage: -1,
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when transactionChatPollIntervalSeconds is out of range', async () => {
      await expect(
        service.updatePlatformConfig(mockCtx, {
          transactionChatPollIntervalSeconds: 200,
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when transactionChatMaxMessages is out of range', async () => {
      await expect(
        service.updatePlatformConfig(mockCtx, {
          transactionChatMaxMessages: 5,
        })
      ).rejects.toThrow(BadRequestException);
    });
  });
});
