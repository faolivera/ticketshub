import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PricingService } from '../../../../../src/modules/payments/pricing/pricing.service';
import { PRICING_REPOSITORY } from '../../../../../src/modules/payments/pricing/pricing.repository.interface';
import type { IPricingRepository } from '../../../../../src/modules/payments/pricing/pricing.repository.interface';
import { PlatformConfigService } from '../../../../../src/modules/config/config.service';
import { PaymentMethodsService } from '../../../../../src/modules/payments/payment-methods.service';
import {
  PricingSnapshotError,
  type PricingSnapshot,
} from '../../../../../src/modules/payments/pricing/pricing.domain';
import type { PaymentMethodOption } from '../../../../../src/modules/payments/payments.domain';
import type { Ctx } from '../../../../../src/common/types/context';

describe('PricingService', () => {
  let service: PricingService;
  let repository: jest.Mocked<IPricingRepository>;
  let platformConfigService: jest.Mocked<PlatformConfigService>;
  let paymentMethodsService: jest.Mocked<PaymentMethodsService>;

  const mockCtx: Ctx = { source: 'HTTP', requestId: 'test-request-id' };

  const mockPaymentMethods: PaymentMethodOption[] = [
    {
      id: 'pm_payway',
      name: 'Payway',
      publicName: 'Payway',
      type: 'payment_gateway',
      status: 'enabled',
      buyerCommissionPercent: 12,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'pm_bank_transfer',
      name: 'Bank Transfer',
      publicName: 'Bank Transfer',
      type: 'manual_approval',
      status: 'enabled',
      buyerCommissionPercent: 0,
      bankTransferConfig: {
        cbu: '123456789',
        accountHolderName: 'Test',
        bankName: 'Test Bank',
        cuitCuil: '12-12345678-9',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const createMockSnapshot = (overrides: Partial<PricingSnapshot> = {}): PricingSnapshot => ({
    id: 'ps_test_123',
    listingId: 'listing_123',
    pricePerTicket: { amount: 10000, currency: 'USD' },
    buyerPlatformFeePercentage: 10,
    sellerPlatformFeePercentage: 5,
    paymentMethodCommissions: [
      { paymentMethodId: 'pm_payway', paymentMethodName: 'Payway', commissionPercent: 12 },
      { paymentMethodId: 'pm_bank_transfer', paymentMethodName: 'Bank Transfer', commissionPercent: 0 },
    ],
    pricingModel: 'fixed',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    ...overrides,
  });

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      consumeAtomic: jest.fn(),
      deleteExpired: jest.fn(),
    };

    const mockPlatformConfigService = {
      getPlatformConfig: jest.fn().mockResolvedValue({
        buyerPlatformFeePercentage: 10,
        sellerPlatformFeePercentage: 5,
        paymentTimeoutMinutes: 10,
        adminReviewTimeoutHours: 24,
      }),
    };

    const mockPaymentMethodsService = {
      findEnabled: jest.fn().mockResolvedValue(mockPaymentMethods),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        { provide: PRICING_REPOSITORY, useValue: mockRepository },
        { provide: PlatformConfigService, useValue: mockPlatformConfigService },
        { provide: PaymentMethodsService, useValue: mockPaymentMethodsService },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
    repository = module.get(PRICING_REPOSITORY);
    platformConfigService = module.get(PlatformConfigService);
    paymentMethodsService = module.get(PaymentMethodsService);
  });

  describe('createSnapshot', () => {
    it('should create a pricing snapshot with all enabled payment methods', async () => {
      const listingId = 'listing_123';
      const pricePerTicket = { amount: 10000, currency: 'USD' as const };

      repository.create.mockImplementation(async (_, snapshot) => snapshot);

      const result = await service.createSnapshot(mockCtx, {
        id: listingId,
        pricePerTicket,
      });

      expect(result.listingId).toBe(listingId);
      expect(result.pricePerTicket).toEqual(pricePerTicket);
      expect(result.buyerPlatformFeePercentage).toBe(10);
      expect(result.sellerPlatformFeePercentage).toBe(5);
      expect(result.pricingModel).toBe('fixed');
      expect(result.paymentMethodCommissions).toHaveLength(2);
      expect(result.paymentMethodCommissions[0]).toEqual({
        paymentMethodId: 'pm_payway',
        paymentMethodName: 'Payway',
        commissionPercent: 12,
      });
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(repository.create).toHaveBeenCalledWith(mockCtx, expect.objectContaining({
        listingId,
        pricePerTicket,
      }));
    });
  });

  describe('validateAndConsume', () => {
    it('should validate and consume a valid snapshot using atomic operation', async () => {
      const snapshot = createMockSnapshot();
      const consumedSnapshot = { ...snapshot, consumedAt: new Date(), consumedByTransactionId: 'txn_123' };
      repository.findById.mockResolvedValue(snapshot);
      repository.consumeAtomic.mockResolvedValue(consumedSnapshot);

      const result = await service.validateAndConsume(
        mockCtx,
        snapshot.id,
        snapshot.listingId,
        'pm_payway',
        'txn_123',
      );

      expect(result.snapshot).toEqual(consumedSnapshot);
      expect(result.selectedCommissionPercent).toBe(12);
      expect(repository.consumeAtomic).toHaveBeenCalledWith(
        mockCtx,
        snapshot.id,
        snapshot.listingId,
        'txn_123',
        'pm_payway',
      );
    });

    it('should throw NOT_FOUND if snapshot does not exist on initial lookup', async () => {
      repository.findById.mockResolvedValue(undefined);

      await expect(
        service.validateAndConsume(mockCtx, 'nonexistent', 'listing_123', 'pm_payway', 'txn_123'),
      ).rejects.toThrow(BadRequestException);

      try {
        await service.validateAndConsume(mockCtx, 'nonexistent', 'listing_123', 'pm_payway', 'txn_123');
      } catch (error) {
        expect((error as BadRequestException).getResponse()).toEqual({
          code: PricingSnapshotError.NOT_FOUND,
          message: expect.any(String),
        });
      }
    });

    it('should throw ALREADY_CONSUMED when atomic consume fails and snapshot was consumed', async () => {
      const snapshot = createMockSnapshot();
      const consumedSnapshot = createMockSnapshot({
        consumedByTransactionId: 'txn_previous',
      });
      repository.findById
        .mockResolvedValueOnce(snapshot)
        .mockResolvedValueOnce(consumedSnapshot);
      repository.consumeAtomic.mockResolvedValue(undefined);

      await expect(
        service.validateAndConsume(mockCtx, snapshot.id, snapshot.listingId, 'pm_payway', 'txn_123'),
      ).rejects.toThrow(BadRequestException);

      try {
        repository.findById
          .mockResolvedValueOnce(snapshot)
          .mockResolvedValueOnce(consumedSnapshot);
        repository.consumeAtomic.mockResolvedValue(undefined);
        await service.validateAndConsume(mockCtx, snapshot.id, snapshot.listingId, 'pm_payway', 'txn_123');
      } catch (error) {
        expect((error as BadRequestException).getResponse()).toEqual({
          code: PricingSnapshotError.ALREADY_CONSUMED,
          message: expect.any(String),
        });
      }
    });

    it('should throw EXPIRED when atomic consume fails due to expiration', async () => {
      const snapshot = createMockSnapshot();
      const expiredSnapshot = createMockSnapshot({
        expiresAt: new Date(Date.now() - 1000),
      });
      repository.findById
        .mockResolvedValueOnce(snapshot)
        .mockResolvedValueOnce(expiredSnapshot);
      repository.consumeAtomic.mockResolvedValue(undefined);

      await expect(
        service.validateAndConsume(mockCtx, snapshot.id, snapshot.listingId, 'pm_payway', 'txn_123'),
      ).rejects.toThrow(BadRequestException);

      try {
        repository.findById
          .mockResolvedValueOnce(snapshot)
          .mockResolvedValueOnce(expiredSnapshot);
        repository.consumeAtomic.mockResolvedValue(undefined);
        await service.validateAndConsume(mockCtx, snapshot.id, snapshot.listingId, 'pm_payway', 'txn_123');
      } catch (error) {
        expect((error as BadRequestException).getResponse()).toEqual({
          code: PricingSnapshotError.EXPIRED,
          message: expect.any(String),
        });
      }
    });

    it('should throw LISTING_MISMATCH when atomic consume fails due to listing mismatch', async () => {
      const snapshot = createMockSnapshot();
      repository.findById
        .mockResolvedValueOnce(snapshot)
        .mockResolvedValueOnce(snapshot);
      repository.consumeAtomic.mockResolvedValue(undefined);

      await expect(
        service.validateAndConsume(mockCtx, snapshot.id, 'different_listing', 'pm_payway', 'txn_123'),
      ).rejects.toThrow(BadRequestException);

      try {
        repository.findById
          .mockResolvedValueOnce(snapshot)
          .mockResolvedValueOnce(snapshot);
        repository.consumeAtomic.mockResolvedValue(undefined);
        await service.validateAndConsume(mockCtx, snapshot.id, 'different_listing', 'pm_payway', 'txn_123');
      } catch (error) {
        expect((error as BadRequestException).getResponse()).toEqual({
          code: PricingSnapshotError.LISTING_MISMATCH,
          message: expect.any(String),
        });
      }
    });

    it('should throw PAYMENT_METHOD_NOT_AVAILABLE if payment method not in snapshot', async () => {
      const snapshot = createMockSnapshot();
      repository.findById.mockResolvedValue(snapshot);

      await expect(
        service.validateAndConsume(mockCtx, snapshot.id, snapshot.listingId, 'pm_unknown', 'txn_123'),
      ).rejects.toThrow(BadRequestException);

      try {
        await service.validateAndConsume(mockCtx, snapshot.id, snapshot.listingId, 'pm_unknown', 'txn_123');
      } catch (error) {
        expect((error as BadRequestException).getResponse()).toEqual({
          code: PricingSnapshotError.PAYMENT_METHOD_NOT_AVAILABLE,
          message: expect.any(String),
        });
      }
    });

    it('should return 0 commission if payment method has null commission', async () => {
      const snapshot = createMockSnapshot({
        paymentMethodCommissions: [
          { paymentMethodId: 'pm_null', paymentMethodName: 'No Commission', commissionPercent: null },
        ],
      });
      const consumedSnapshot = { ...snapshot, consumedAt: new Date() };
      repository.findById.mockResolvedValue(snapshot);
      repository.consumeAtomic.mockResolvedValue(consumedSnapshot);

      const result = await service.validateAndConsume(
        mockCtx,
        snapshot.id,
        snapshot.listingId,
        'pm_null',
        'txn_123',
      );

      expect(result.selectedCommissionPercent).toBe(0);
    });

    it('should throw NOT_FOUND when atomic consume fails and snapshot no longer exists', async () => {
      const snapshot = createMockSnapshot();
      repository.findById
        .mockResolvedValueOnce(snapshot)
        .mockResolvedValueOnce(undefined);
      repository.consumeAtomic.mockResolvedValue(undefined);

      await expect(
        service.validateAndConsume(mockCtx, snapshot.id, snapshot.listingId, 'pm_payway', 'txn_123'),
      ).rejects.toThrow(BadRequestException);

      try {
        repository.findById
          .mockResolvedValueOnce(snapshot)
          .mockResolvedValueOnce(undefined);
        repository.consumeAtomic.mockResolvedValue(undefined);
        await service.validateAndConsume(mockCtx, snapshot.id, snapshot.listingId, 'pm_payway', 'txn_123');
      } catch (error) {
        expect((error as BadRequestException).getResponse()).toEqual({
          code: PricingSnapshotError.NOT_FOUND,
          message: expect.any(String),
        });
      }
    });

    it('should handle concurrent consumption - only first request succeeds', async () => {
      const snapshot = createMockSnapshot();
      const consumedSnapshot = { ...snapshot, consumedAt: new Date(), consumedByTransactionId: 'txn_first' };

      repository.findById.mockResolvedValue(snapshot);
      repository.consumeAtomic
        .mockResolvedValueOnce(consumedSnapshot)
        .mockResolvedValueOnce(undefined);

      const result1 = await service.validateAndConsume(
        mockCtx,
        snapshot.id,
        snapshot.listingId,
        'pm_payway',
        'txn_first',
      );
      expect(result1.snapshot.consumedByTransactionId).toBe('txn_first');

      repository.findById
        .mockResolvedValueOnce(snapshot)
        .mockResolvedValueOnce({ ...snapshot, consumedByTransactionId: 'txn_first' });

      await expect(
        service.validateAndConsume(mockCtx, snapshot.id, snapshot.listingId, 'pm_payway', 'txn_second'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findById', () => {
    it('should return snapshot if found', async () => {
      const snapshot = createMockSnapshot();
      repository.findById.mockResolvedValue(snapshot);

      const result = await service.findById(mockCtx, snapshot.id);

      expect(result).toEqual(snapshot);
    });

    it('should return undefined if not found', async () => {
      repository.findById.mockResolvedValue(undefined);

      const result = await service.findById(mockCtx, 'nonexistent');

      expect(result).toBeUndefined();
    });
  });
});
