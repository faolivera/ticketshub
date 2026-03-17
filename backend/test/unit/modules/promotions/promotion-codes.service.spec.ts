import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PromotionCodesService } from '../../../../src/modules/promotions/promotion-codes.service';
import { PromotionsService } from '../../../../src/modules/promotions/promotions.service';
import { PROMOTION_CODES_REPOSITORY } from '../../../../src/modules/promotions/promotion-codes.repository.interface';
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

describe('PromotionCodesService', () => {
  let service: PromotionCodesService;
  let promotionCodesRepository: jest.Mocked<IPromotionCodesRepository>;
  let promotionsService: jest.Mocked<PromotionsService>;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const mockPromotionCodesRepository = {
      create: jest.fn(),
      findByCode: jest.fn(),
      findById: jest.fn(),
      list: jest.fn(),
      update: jest.fn(),
      incrementUsedCount: jest.fn(),
    };

    const mockPromotionsService = {
      hasUserClaimedPromotionCode: jest.fn().mockResolvedValue(false),
      createFromPromotionCodeClaim: jest.fn(),
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
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromotionCodesService,
        { provide: PROMOTION_CODES_REPOSITORY, useValue: mockPromotionCodesRepository },
        { provide: PromotionsService, useValue: mockPromotionsService },
        { provide: PlatformConfigService, useValue: mockPlatformConfig },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<PromotionCodesService>(PromotionCodesService);
    promotionCodesRepository = module.get(PROMOTION_CODES_REPOSITORY);
    promotionsService = module.get(PromotionsService);
    usersService = module.get(UsersService);
  });

  describe('checkSellerPromotionCode', () => {
    it('should return null when code does not exist', async () => {
      promotionCodesRepository.findByCode.mockResolvedValue(undefined);

      const result = await service.checkSellerPromotionCode(mockCtx, 'MISSING', 'user_1');

      expect(result).toBeNull();
      expect(promotionCodesRepository.findByCode).toHaveBeenCalledWith(
        mockCtx,
        'MISSING',
      );
    });

    it('should return null when target is buyer', async () => {
      const pc = createMockPromotionCode({
        target: 'buyer',
        promotionConfig: {
          type: PromotionType.BUYER_DISCOUNTED_FEE,
          config: { feePercentage: 0 },
          maxUsages: 5,
          usedCount: 0,
          usedInListingIds: [],
          status: PromotionStatus.Active,
          validUntil: null,
        },
      });
      promotionCodesRepository.findByCode.mockResolvedValue(pc);
      usersService.findById.mockResolvedValue(createMockUser());

      const result = await service.checkSellerPromotionCode(mockCtx, 'SAVE10', 'user_1');

      expect(result).toBeNull();
    });

    it('should return null when code is expired', async () => {
      const past = new Date(Date.now() - 86400000);
      const pc = createMockPromotionCode({
        target: 'seller',
        validUntil: past,
        promotionConfig: {
          type: PromotionType.BUYER_DISCOUNTED_FEE,
          config: { feePercentage: 0 },
          maxUsages: 5,
          usedCount: 0,
          usedInListingIds: [],
          status: PromotionStatus.Active,
          validUntil: null,
        },
      });
      promotionCodesRepository.findByCode.mockResolvedValue(pc);
      usersService.findById.mockResolvedValue(createMockUser());

      const result = await service.checkSellerPromotionCode(mockCtx, 'SAVE10', 'user_1');

      expect(result).toBeNull();
    });

    it('should return null when usedCount >= maxUsages', async () => {
      const pc = createMockPromotionCode({
        target: 'seller',
        maxUsages: 10,
        usedCount: 10,
        promotionConfig: {
          type: PromotionType.BUYER_DISCOUNTED_FEE,
          config: { feePercentage: 0 },
          maxUsages: 5,
          usedCount: 0,
          usedInListingIds: [],
          status: PromotionStatus.Active,
          validUntil: null,
        },
      });
      promotionCodesRepository.findByCode.mockResolvedValue(pc);
      usersService.findById.mockResolvedValue(createMockUser());

      const result = await service.checkSellerPromotionCode(mockCtx, 'SAVE10', 'user_1');

      expect(result).toBeNull();
    });

    it('should return config when type is not SELLER_DISCOUNTED_FEE (service returns config for any valid seller code)', async () => {
      const pc = createMockPromotionCode({
        target: 'seller',
        promotionConfig: {
          type: PromotionType.BUYER_DISCOUNTED_FEE,
          config: { feePercentage: 0 },
          maxUsages: 5,
          usedCount: 0,
          usedInListingIds: [],
          status: PromotionStatus.Active,
          validUntil: null,
        },
      });
      promotionCodesRepository.findByCode.mockResolvedValue(pc);
      usersService.findById.mockResolvedValue(createMockUser());

      const result = await service.checkSellerPromotionCode(mockCtx, 'SAVE10', 'user_1');

      expect(result).toEqual({
        code: 'SAVE10',
        name: 'SAVE10',
        target: 'seller',
        type: PromotionType.BUYER_DISCOUNTED_FEE,
        config: { feePercentage: 0 },
      });
    });

    it('should return config when valid SELLER_DISCOUNTED_FEE and target seller', async () => {
      const pc = createMockPromotionCode({
        target: 'seller',
        promotionConfig: {
          type: PromotionType.SELLER_DISCOUNTED_FEE,
          config: { feePercentage: 2 },
          maxUsages: 5,
          usedCount: 0,
          usedInListingIds: [],
          status: PromotionStatus.Active,
          validUntil: null,
        },
      });
      promotionCodesRepository.findByCode.mockResolvedValue(pc);
      usersService.findById.mockResolvedValue(createMockUser());

      const result = await service.checkSellerPromotionCode(mockCtx, ' SAVE10 ', 'user_1');

      expect(result).toEqual({
        code: 'SAVE10',
        name: 'SAVE10',
        target: 'seller',
        type: PromotionType.SELLER_DISCOUNTED_FEE,
        config: { feePercentage: 2 },
      });
      expect(promotionCodesRepository.findByCode).toHaveBeenCalledWith(
        mockCtx,
        'SAVE10',
      );
    });

    it('should return config when valid SELLER_DISCOUNTED_FEE and target verified_seller', async () => {
      const pc = createMockPromotionCode({
        target: 'verified_seller',
        code: 'VERIFIED',
        promotionConfig: {
          type: PromotionType.SELLER_DISCOUNTED_FEE,
          config: { feePercentage: 0 },
          maxUsages: 5,
          usedCount: 0,
          usedInListingIds: [],
          status: PromotionStatus.Active,
          validUntil: null,
        },
      });
      promotionCodesRepository.findByCode.mockResolvedValue(pc);
      usersService.findById.mockResolvedValue(createMockUser());

      const result = await service.checkSellerPromotionCode(mockCtx, 'VERIFIED', 'user_1');

      expect(result).toEqual({
        code: 'VERIFIED',
        name: 'VERIFIED',
        target: 'verified_seller',
        type: PromotionType.SELLER_DISCOUNTED_FEE,
        config: { feePercentage: 0 },
      });
    });
  });

  describe('claimPromotionCode', () => {
    it('should throw ForbiddenException when code does not exist', async () => {
      promotionCodesRepository.findByCode.mockResolvedValue(undefined);

      await expect(
        service.claimPromotionCode(mockCtx, 'buyer', 'INVALID', 'user_1'),
      ).rejects.toThrow(ForbiddenException);

      expect(promotionsService.createFromPromotionCodeClaim).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when code has no remaining usages', async () => {
      const pc = createMockPromotionCode({ maxUsages: 10, usedCount: 10 });
      promotionCodesRepository.findByCode.mockResolvedValue(pc);
      usersService.findById.mockResolvedValue(createMockUser());

      await expect(
        service.claimPromotionCode(mockCtx, 'buyer', 'SAVE10', 'user_1'),
      ).rejects.toThrow(ForbiddenException);

      expect(promotionsService.createFromPromotionCodeClaim).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when code has expired (validUntil in the past)', async () => {
      const past = new Date(Date.now() - 86400000);
      const pc = createMockPromotionCode({ validUntil: past });
      promotionCodesRepository.findByCode.mockResolvedValue(pc);
      usersService.findById.mockResolvedValue(createMockUser());

      await expect(
        service.claimPromotionCode(mockCtx, 'buyer', 'SAVE10', 'user_1'),
      ).rejects.toThrow(ForbiddenException);

      expect(promotionsService.createFromPromotionCodeClaim).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user has already claimed this promotion code', async () => {
      const pc = createMockPromotionCode({ target: 'buyer' });
      promotionCodesRepository.findByCode.mockResolvedValue(pc);
      usersService.findById.mockResolvedValue(createMockUser());
      promotionsService.hasUserClaimedPromotionCode.mockResolvedValue(true);

      await expect(
        service.claimPromotionCode(mockCtx, 'buyer', 'SAVE10', 'user_1'),
      ).rejects.toThrow(ForbiddenException);

      expect(promotionsService.createFromPromotionCodeClaim).not.toHaveBeenCalled();
      expect(promotionsService.hasUserClaimedPromotionCode).toHaveBeenCalledWith(
        mockCtx,
        'user_1',
        'pc_1',
      );
    });

    it('should throw ForbiddenException when buyer claims seller-only code', async () => {
      const pc = createMockPromotionCode({ target: 'seller' });
      promotionCodesRepository.findByCode.mockResolvedValue(pc);
      usersService.findById.mockResolvedValue(createMockUser());

      await expect(
        service.claimPromotionCode(mockCtx, 'buyer', 'SAVE10', 'user_1'),
      ).rejects.toThrow(ForbiddenException);

      expect(promotionsService.createFromPromotionCodeClaim).not.toHaveBeenCalled();
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
      promotionsService.createFromPromotionCodeClaim.mockResolvedValue(created);
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
      expect(promotionsService.createFromPromotionCodeClaim).toHaveBeenCalledWith(
        mockCtx,
        'user_1',
        pc,
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
      promotionsService.createFromPromotionCodeClaim.mockResolvedValue(created);
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
      expect(promotionsService.createFromPromotionCodeClaim).toHaveBeenCalledTimes(1);
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

  describe('updatePromotionCode', () => {
    const updateBody = {
      code: 'SAVE20',
      target: 'buyer' as const,
      promotionConfig: {
        type: PromotionType.SELLER_DISCOUNTED_FEE,
        config: { feePercentage: 2 },
        maxUsages: 5,
      },
      maxUsages: 50,
    };

    it('should throw NotFound when promotion code does not exist', async () => {
      promotionCodesRepository.findById.mockResolvedValue(undefined);

      await expect(
        service.updatePromotionCode(mockCtx, 'pc_unknown', updateBody),
      ).rejects.toThrow(NotFoundException);

      expect(promotionCodesRepository.update).not.toHaveBeenCalled();
    });

    it('should throw when fee exceeds platform fee', async () => {
      promotionCodesRepository.findById.mockResolvedValue(
        createMockPromotionCode(),
      );

      await expect(
        service.updatePromotionCode(mockCtx, 'pc_1', {
          ...updateBody,
          promotionConfig: {
            ...updateBody.promotionConfig,
            config: { feePercentage: 10 },
          },
        }),
      ).rejects.toThrow(BadRequestException);

      expect(promotionCodesRepository.update).not.toHaveBeenCalled();
    });

    it('should throw when new code already exists for another promotion code', async () => {
      promotionCodesRepository.findById.mockResolvedValue(
        createMockPromotionCode({ id: 'pc_1', code: 'SAVE10' }),
      );
      promotionCodesRepository.findByCode.mockResolvedValue(
        createMockPromotionCode({ id: 'pc_other', code: 'SAVE20' }),
      );

      await expect(
        service.updatePromotionCode(mockCtx, 'pc_1', updateBody),
      ).rejects.toThrow(BadRequestException);

      expect(promotionCodesRepository.update).not.toHaveBeenCalled();
    });

    it('should update promotion code and return list item', async () => {
      const existing = createMockPromotionCode({
        id: 'pc_1',
        code: 'SAVE10',
        target: 'seller',
      });
      const updated = createMockPromotionCode({
        id: 'pc_1',
        code: 'SAVE20',
        target: 'buyer',
        maxUsages: 50,
      });
      promotionCodesRepository.findById.mockResolvedValue(existing);
      promotionCodesRepository.findByCode.mockResolvedValue(undefined);
      promotionCodesRepository.update.mockResolvedValue(updated);

      const result = await service.updatePromotionCode(
        mockCtx,
        'pc_1',
        updateBody,
      );

      expect(result.id).toBe('pc_1');
      expect(result.code).toBe('SAVE20');
      expect(result.target).toBe('buyer');
      expect(promotionCodesRepository.update).toHaveBeenCalledWith(
        mockCtx,
        'pc_1',
        expect.objectContaining({
          code: 'SAVE20',
          target: 'buyer',
          maxUsages: 50,
        }),
      );
    });
  });
});
