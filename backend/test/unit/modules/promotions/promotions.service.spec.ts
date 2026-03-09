import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PromotionsService } from '../../../../src/modules/promotions/promotions.service';
import { PROMOTIONS_REPOSITORY } from '../../../../src/modules/promotions/promotions.repository.interface';
import type { IPromotionsRepository } from '../../../../src/modules/promotions/promotions.repository.interface';
import { PlatformConfigService } from '../../../../src/modules/config/config.service';
import { UsersService } from '../../../../src/modules/users/users.service';
import {
  PromotionType,
  PromotionStatus,
  type Promotion,
} from '../../../../src/modules/promotions/promotions.domain';
import type { Ctx } from '../../../../src/common/types/context';

const mockCtx: Ctx = { source: 'HTTP', requestId: 'test-request-id' };

function createMockPromotion(overrides: Partial<Promotion> = {}): Promotion {
  return {
    id: 'promo_1',
    userId: 'user_1',
    name: 'Test promotion',
    type: PromotionType.SELLER_DISCOUNTED_FEE,
    config: { feePercentage: 2 },
    maxUsages: 10,
    usedCount: 0,
    usedInListingIds: [],
    status: PromotionStatus.Active,
    validUntil: null,
    createdAt: new Date(),
    createdBy: 'admin_1',
    ...overrides,
  };
}

describe('PromotionsService', () => {
  let service: PromotionsService;
  let repository: jest.Mocked<IPromotionsRepository>;
  let platformConfigService: jest.Mocked<PlatformConfigService>;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findActiveByUserIdAndType: jest.fn(),
      list: jest.fn(),
      updateStatus: jest.fn(),
      incrementUsedAndAddListingId: jest.fn(),
      deactivateByUserIdAndType: jest.fn().mockResolvedValue(0),
    };

    const mockPlatformConfig = {
      getPlatformConfig: jest.fn().mockResolvedValue({
        sellerPlatformFeePercentage: 5,
        buyerPlatformFeePercentage: 10,
        paymentTimeoutMinutes: 15,
        adminReviewTimeoutHours: 24,
        offerPendingExpirationMinutes: 1440,
        offerAcceptedExpirationMinutes: 1440,
      }),
    };

    const mockUsersService = {
      findByIds: jest
        .fn()
        .mockResolvedValue([{ id: 'user_1', email: 'a@test.com' }]),
      findByEmail: jest
        .fn()
        .mockResolvedValue({ id: 'user_1', email: 'a@test.com' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromotionsService,
        { provide: PROMOTIONS_REPOSITORY, useValue: mockRepository },
        { provide: PlatformConfigService, useValue: mockPlatformConfig },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<PromotionsService>(PromotionsService);
    repository = module.get(PROMOTIONS_REPOSITORY);
    platformConfigService = module.get(PlatformConfigService);
    usersService = module.get(UsersService);
  });

  describe('create', () => {
    it('should throw when feePercentage exceeds platform seller fee', async () => {
      await expect(
        service.create(
          mockCtx,
          {
            name: 'Promo',
            type: PromotionType.SELLER_DISCOUNTED_FEE,
            config: { feePercentage: 10 },
            maxUsages: 5,
            emails: ['a@test.com'],
          },
          'admin_1',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should create one promotion per user when given emails', async () => {
      repository.deactivateByUserIdAndType.mockResolvedValue(0);
      repository.create.mockImplementation(async (_ctx, data) => ({
        ...createMockPromotion(),
        ...data,
        id: 'promo_1',
        createdAt: new Date(),
      }));

      const result = await service.create(
        mockCtx,
        {
          name: 'Summer promo',
          type: PromotionType.SELLER_DISCOUNTED_FEE,
          config: { feePercentage: 2 },
          maxUsages: 5,
          emails: ['a@test.com'],
        },
        'admin_1',
      );

      expect(usersService.findByEmail).toHaveBeenCalledWith(
        mockCtx,
        'a@test.com',
      );
      expect(repository.deactivateByUserIdAndType).toHaveBeenCalledWith(
        mockCtx,
        'user_1',
        PromotionType.SELLER_DISCOUNTED_FEE,
      );
      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Summer promo');
      expect(result[0].config.feePercentage).toBe(2);
    });

    it('should throw when no valid users (empty emails)', async () => {
      usersService.findByEmail.mockResolvedValue(undefined);

      await expect(
        service.create(
          mockCtx,
          {
            name: 'Promo',
            type: PromotionType.SELLER_DISCOUNTED_FEE,
            config: { feePercentage: 2 },
            maxUsages: 5,
            emails: ['nonexistent@test.com'],
          },
          'admin_1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getActiveForUser', () => {
    it('should return active promotion when one exists', async () => {
      const promo = createMockPromotion();
      repository.findActiveByUserIdAndType.mockResolvedValue(promo);

      const result = await service.getActiveForUser(
        mockCtx,
        'user_1',
        PromotionType.SELLER_DISCOUNTED_FEE,
      );

      expect(result).toEqual(promo);
      expect(repository.findActiveByUserIdAndType).toHaveBeenCalledWith(
        mockCtx,
        'user_1',
        PromotionType.SELLER_DISCOUNTED_FEE,
      );
    });

    it('should return null when no active promotion', async () => {
      repository.findActiveByUserIdAndType.mockResolvedValue(undefined);

      const result = await service.getActiveForUser(
        mockCtx,
        'user_1',
        PromotionType.SELLER_DISCOUNTED_FEE,
      );

      expect(result).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should deactivate others when activating', async () => {
      const existing = createMockPromotion({
        id: 'promo_1',
        status: PromotionStatus.Inactive,
      });
      repository.findById.mockResolvedValue(existing);
      repository.updateStatus.mockResolvedValue({
        ...existing,
        status: PromotionStatus.Active,
      });

      await service.updateStatus(mockCtx, 'promo_1', {
        status: PromotionStatus.Active,
      });

      expect(repository.deactivateByUserIdAndType).toHaveBeenCalledWith(
        mockCtx,
        'user_1',
        PromotionType.SELLER_DISCOUNTED_FEE,
      );
      expect(repository.updateStatus).toHaveBeenCalledWith(
        mockCtx,
        'promo_1',
        PromotionStatus.Active,
      );
    });
  });

  describe('incrementUsedAndAddListingId', () => {
    it('should call repository and throw when update fails', async () => {
      repository.incrementUsedAndAddListingId.mockResolvedValue(undefined);

      await expect(
        service.incrementUsedAndAddListingId(mockCtx, 'promo_1', 'listing_1'),
      ).rejects.toThrow(BadRequestException);

      expect(repository.incrementUsedAndAddListingId).toHaveBeenCalledWith(
        mockCtx,
        'promo_1',
        'listing_1',
      );
    });

    it('should succeed when repository returns updated promotion', async () => {
      const updated = createMockPromotion({
        usedCount: 1,
        usedInListingIds: ['listing_1'],
      });
      repository.incrementUsedAndAddListingId.mockResolvedValue(updated);

      await service.incrementUsedAndAddListingId(
        mockCtx,
        'promo_1',
        'listing_1',
      );

      expect(repository.incrementUsedAndAddListingId).toHaveBeenCalledWith(
        mockCtx,
        'promo_1',
        'listing_1',
      );
    });
  });

  describe('toSnapshot', () => {
    it('should return snapshot with id, name, type, config', () => {
      const promo = createMockPromotion();
      const snapshot = service.toSnapshot(promo);

      expect(snapshot).toEqual({
        id: promo.id,
        name: promo.name,
        type: promo.type,
        config: promo.config,
      });
    });
  });
});
