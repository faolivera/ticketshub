import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PricingService } from '../../../../../modules/payments/pricing/pricing.service';
import { PricingRepository } from '../../../../../modules/payments/pricing/pricing.repository';
import { ConfigService } from '../../../../../modules/config/config.service';
import { PaymentMethodsService } from '../../../../../modules/payments/payment-methods.service';
import {
  PricingSnapshotError,
  type PricingSnapshot,
} from '../../../../../modules/payments/pricing/pricing.domain';
import type { PaymentMethodOption } from '../../../../../modules/payments/payments.domain';
import type { Ctx } from '../../../../../common/types/context';

describe('PricingService', () => {
  let service: PricingService;
  let repository: jest.Mocked<PricingRepository>;
  let configService: jest.Mocked<ConfigService>;
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
    };

    const mockConfigService = {
      getBuyerPlatformFeePercentage: jest.fn().mockReturnValue(10),
      getSellerPlatformFeePercentage: jest.fn().mockReturnValue(5),
    };

    const mockPaymentMethodsService = {
      findEnabled: jest.fn().mockResolvedValue(mockPaymentMethods),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        { provide: PricingRepository, useValue: mockRepository },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PaymentMethodsService, useValue: mockPaymentMethodsService },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
    repository = module.get(PricingRepository);
    configService = module.get(ConfigService);
    paymentMethodsService = module.get(PaymentMethodsService);
  });

  describe('createSnapshot', () => {
    it('should create a pricing snapshot with all enabled payment methods', async () => {
      const listingId = 'listing_123';
      const pricePerTicket = { amount: 10000, currency: 'USD' as const };

      repository.create.mockImplementation(async (_, snapshot) => snapshot);

      const result = await service.createSnapshot(mockCtx, listingId, pricePerTicket);

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
    it('should validate and consume a valid snapshot', async () => {
      const snapshot = createMockSnapshot();
      repository.findById.mockResolvedValue(snapshot);
      repository.update.mockResolvedValue({ ...snapshot, consumedAt: new Date() });

      const result = await service.validateAndConsume(
        mockCtx,
        snapshot.id,
        snapshot.listingId,
        'pm_payway',
        'txn_123',
      );

      expect(result.snapshot).toEqual(snapshot);
      expect(result.selectedCommissionPercent).toBe(12);
      expect(repository.update).toHaveBeenCalledWith(
        mockCtx,
        snapshot.id,
        expect.objectContaining({
          consumedByTransactionId: 'txn_123',
          selectedPaymentMethodId: 'pm_payway',
        }),
      );
    });

    it('should throw NOT_FOUND if snapshot does not exist', async () => {
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

    it('should throw ALREADY_CONSUMED if snapshot was already used', async () => {
      const snapshot = createMockSnapshot({
        consumedByTransactionId: 'txn_previous',
      });
      repository.findById.mockResolvedValue(snapshot);

      await expect(
        service.validateAndConsume(mockCtx, snapshot.id, snapshot.listingId, 'pm_payway', 'txn_123'),
      ).rejects.toThrow(BadRequestException);

      try {
        await service.validateAndConsume(mockCtx, snapshot.id, snapshot.listingId, 'pm_payway', 'txn_123');
      } catch (error) {
        expect((error as BadRequestException).getResponse()).toEqual({
          code: PricingSnapshotError.ALREADY_CONSUMED,
          message: expect.any(String),
        });
      }
    });

    it('should throw EXPIRED if snapshot has expired', async () => {
      const snapshot = createMockSnapshot({
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      });
      repository.findById.mockResolvedValue(snapshot);

      await expect(
        service.validateAndConsume(mockCtx, snapshot.id, snapshot.listingId, 'pm_payway', 'txn_123'),
      ).rejects.toThrow(BadRequestException);

      try {
        await service.validateAndConsume(mockCtx, snapshot.id, snapshot.listingId, 'pm_payway', 'txn_123');
      } catch (error) {
        expect((error as BadRequestException).getResponse()).toEqual({
          code: PricingSnapshotError.EXPIRED,
          message: expect.any(String),
        });
      }
    });

    it('should throw LISTING_MISMATCH if listing ID does not match', async () => {
      const snapshot = createMockSnapshot();
      repository.findById.mockResolvedValue(snapshot);

      await expect(
        service.validateAndConsume(mockCtx, snapshot.id, 'different_listing', 'pm_payway', 'txn_123'),
      ).rejects.toThrow(BadRequestException);

      try {
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
      repository.findById.mockResolvedValue(snapshot);
      repository.update.mockResolvedValue({ ...snapshot, consumedAt: new Date() });

      const result = await service.validateAndConsume(
        mockCtx,
        snapshot.id,
        snapshot.listingId,
        'pm_null',
        'txn_123',
      );

      expect(result.selectedCommissionPercent).toBe(0);
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
