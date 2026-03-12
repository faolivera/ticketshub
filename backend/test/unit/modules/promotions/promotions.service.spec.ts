import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PromotionsService } from '../../../../src/modules/promotions/promotions.service';
import { PROMOTIONS_REPOSITORY } from '../../../../src/modules/promotions/promotions.repository.interface';
import { PROMOTION_CODES_REPOSITORY } from '../../../../src/modules/promotions/promotion-codes.repository.interface';
import type { IPromotionsRepository } from '../../../../src/modules/promotions/promotions.repository.interface';
import type { IPromotionCodesRepository } from '../../../../src/modules/promotions/promotion-codes.repository.interface';
import { PlatformConfigService } from '../../../../src/modules/config/config.service';
import { UsersService } from '../../../../src/modules/users/users.service';
import {
  PromotionType,
  PromotionStatus,
  type Promotion,
  type PromotionCode,
} from '../../../../src/modules/promotions/promotions.domain';
import type { Ctx } from '../../../../src/common/types/context';
import type { User } from '../../../../src/modules/users/users.domain';
import {
  Language,
  IdentityVerificationStatus,
} from '../../../../src/modules/users/users.domain';

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

function createMockPromotionCode(overrides: Partial<PromotionCode> = {}): PromotionCode {
  return {
    id: 'pc_1',
    code: 'SAVE10',
    promotionConfig: {
      type: PromotionType.SELLER_DISCOUNTED_FEE,
      config: { feePercentage: 2 },
      maxUsages: 5,
      usedCount: 0,
      usedInListingIds: [],
      status: PromotionStatus.Active,
      validUntil: null,
    },
    target: 'seller',
    maxUsages: 100,
    usedCount: 0,
    validUntil: null,
    createdAt: new Date(),
    createdBy: 'admin_1',
    ...overrides,
  };
}

function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user_1',
    email: 'u@test.com',
    firstName: 'F',
    lastName: 'L',
    role: 'User' as User['role'],
    status: 'Enabled' as User['status'],
    publicName: 'User',
    imageId: 'img_1',
    password: '',
    country: 'DE',
    currency: 'EUR',
    language: Language.EN,
    emailVerified: true,
    phoneVerified: true,
    acceptedSellerTermsAt: new Date(),
    identityVerification: {
      status: IdentityVerificationStatus.Approved,
      legalFirstName: 'F',
      legalLastName: 'L',
      dateOfBirth: '1990-01-01',
      governmentIdNumber: '123',
      submittedAt: new Date(),
    },
    bankAccount: {
      holderName: 'Holder',
      cbuOrCvu: '123',
      verified: true,
    },
    buyerDisputed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('PromotionsService', () => {
  let service: PromotionsService;
  let repository: jest.Mocked<IPromotionsRepository>;
  let promotionCodesRepository: jest.Mocked<IPromotionCodesRepository>;
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

    const mockPromotionCodesRepository = {
      create: jest.fn(),
      findByCode: jest.fn(),
      findById: jest.fn(),
      list: jest.fn(),
      incrementUsedCount: jest.fn(),
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
      findById: jest.fn(),
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
        { provide: PROMOTION_CODES_REPOSITORY, useValue: mockPromotionCodesRepository },
        { provide: PlatformConfigService, useValue: mockPlatformConfig },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<PromotionsService>(PromotionsService);
    repository = module.get(PROMOTIONS_REPOSITORY);
    promotionCodesRepository = module.get(PROMOTION_CODES_REPOSITORY);
    void module.get(PlatformConfigService);
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

  describe('claimPromotionCode', () => {
    it('should throw NotFoundException when code does not exist', async () => {
      promotionCodesRepository.findByCode.mockResolvedValue(undefined);

      await expect(
        service.claimPromotionCode(mockCtx, 'buyer', 'INVALID', 'user_1'),
      ).rejects.toThrow(NotFoundException);

      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when code has no remaining usages', async () => {
      const pc = createMockPromotionCode({ maxUsages: 10, usedCount: 10 });
      promotionCodesRepository.findByCode.mockResolvedValue(pc);

      await expect(
        service.claimPromotionCode(mockCtx, 'buyer', 'SAVE10', 'user_1'),
      ).rejects.toThrow(BadRequestException);

      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when code has expired (validUntil in the past)', async () => {
      const past = new Date(Date.now() - 86400000);
      const pc = createMockPromotionCode({ validUntil: past });
      promotionCodesRepository.findByCode.mockResolvedValue(pc);

      await expect(
        service.claimPromotionCode(mockCtx, 'buyer', 'SAVE10', 'user_1'),
      ).rejects.toThrow(BadRequestException);

      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when buyer claims seller-only code', async () => {
      const pc = createMockPromotionCode({ target: 'seller' });
      promotionCodesRepository.findByCode.mockResolvedValue(pc);
      usersService.findById.mockResolvedValue(createMockUser());

      await expect(
        service.claimPromotionCode(mockCtx, 'buyer', 'SAVE10', 'user_1'),
      ).rejects.toThrow(ForbiddenException);

      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should create promotion and increment used count when buyer claims buyer code', async () => {
      const pc = createMockPromotionCode({ target: 'buyer' });
      promotionCodesRepository.findByCode.mockResolvedValue(pc);
      usersService.findById.mockResolvedValue(createMockUser());
      const created = createMockPromotion({
        name: 'SAVE10',
        createdBy: 'user_1',
        promotionCodeId: 'pc_1',
      });
      repository.create.mockResolvedValue(created);
      promotionCodesRepository.incrementUsedCount.mockResolvedValue({
        ...pc,
        usedCount: 1,
      });

      const result = await service.claimPromotionCode(
        mockCtx,
        'buyer',
        'save10',
        'user_1',
      );

      expect(result).toEqual(created);
      expect(repository.create).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          userId: 'user_1',
          name: 'SAVE10',
          createdBy: 'user_1',
          promotionCodeId: 'pc_1',
        }),
      );
      expect(promotionCodesRepository.incrementUsedCount).toHaveBeenCalledWith(
        mockCtx,
        'pc_1',
      );
    });

    it('should create promotion when seller claims seller code and canSell', async () => {
      const pc = createMockPromotionCode({ target: 'seller' });
      promotionCodesRepository.findByCode.mockResolvedValue(pc);
      usersService.findById.mockResolvedValue(
        createMockUser({ acceptedSellerTermsAt: new Date(), emailVerified: true, phoneVerified: true }),
      );
      const created = createMockPromotion({
        name: 'SAVE10',
        createdBy: 'user_1',
        promotionCodeId: 'pc_1',
      });
      repository.create.mockResolvedValue(created);
      promotionCodesRepository.incrementUsedCount.mockResolvedValue({
        ...pc,
        usedCount: 1,
      });

      const result = await service.claimPromotionCode(
        mockCtx,
        'seller',
        'SAVE10',
        'user_1',
      );

      expect(result).toEqual(created);
      expect(repository.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('listPromotionCodes', () => {
    it('should return list of promotion codes with serialized dates', async () => {
      const pc = createMockPromotionCode();
      promotionCodesRepository.list.mockResolvedValue([pc]);

      const result = await service.listPromotionCodes(mockCtx);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('pc_1');
      expect(result[0].code).toBe('SAVE10');
      expect(result[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('createPromotionCode', () => {
    it('should throw when fee exceeds platform fee', async () => {
      await expect(
        service.createPromotionCode(
          mockCtx,
          {
            code: 'HIGHFEE',
            target: 'buyer',
            promotionConfig: {
              type: PromotionType.SELLER_DISCOUNTED_FEE,
              config: { feePercentage: 10 },
              maxUsages: 5,
            },
            maxUsages: 100,
          },
          'admin_1',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(promotionCodesRepository.create).not.toHaveBeenCalled();
    });

    it('should throw when code already exists', async () => {
      promotionCodesRepository.findByCode.mockResolvedValue(
        createMockPromotionCode(),
      );

      await expect(
        service.createPromotionCode(
          mockCtx,
          {
            code: 'SAVE10',
            target: 'buyer',
            promotionConfig: {
              type: PromotionType.SELLER_DISCOUNTED_FEE,
              config: { feePercentage: 2 },
              maxUsages: 5,
            },
            maxUsages: 100,
          },
          'admin_1',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(promotionCodesRepository.create).not.toHaveBeenCalled();
    });

    it('should create promotion code and return id and code', async () => {
      promotionCodesRepository.findByCode.mockResolvedValue(undefined);
      promotionCodesRepository.create.mockResolvedValue(
        createMockPromotionCode({ id: 'pc_new', code: 'NEWCODE' }),
      );

      const result = await service.createPromotionCode(
        mockCtx,
        {
          code: 'newcode',
          target: 'seller',
          promotionConfig: {
            type: PromotionType.SELLER_DISCOUNTED_FEE,
            config: { feePercentage: 2 },
            maxUsages: 5,
          },
          maxUsages: 100,
        },
        'admin_1',
      );

      expect(result).toEqual({ id: 'pc_new', code: 'NEWCODE' });
      expect(promotionCodesRepository.create).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          code: 'newcode',
          target: 'seller',
          maxUsages: 100,
          createdBy: 'admin_1',
        }),
      );
    });
  });
});
