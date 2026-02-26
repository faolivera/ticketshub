import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PaymentMethodsService } from '../../../../modules/payments/payment-methods.service';
import { PaymentMethodsRepository } from '../../../../modules/payments/payment-methods.repository';
import type { PaymentMethodOption } from '../../../../modules/payments/payments.domain';
import type { Ctx } from '../../../../common/types/context';

describe('PaymentMethodsService', () => {
  let service: PaymentMethodsService;
  let repository: jest.Mocked<PaymentMethodsRepository>;

  const mockCtx: Ctx = { source: 'HTTP', requestId: 'test-request-id' };

  const mockPaymentMethod: PaymentMethodOption = {
    id: 'pm_123',
    name: 'MercadoPago Principal',
    publicName: 'Credit/Debit Card',
    type: 'payment_gateway',
    status: 'enabled',
    buyerCommissionPercent: 12,
    gatewayProvider: 'mercadopago',
    gatewayConfigEnvPrefix: 'MERCADOPAGO_MAIN',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockBankTransferMethod: PaymentMethodOption = {
    id: 'pm_456',
    name: 'Banco Nacion',
    publicName: 'Bank Transfer',
    type: 'manual_approval',
    status: 'enabled',
    buyerCommissionPercent: 5,
    bankTransferConfig: {
      cbu: '0110012345678901234567',
      accountHolderName: 'TicketsHub SA',
      bankName: 'Banco Nacion',
      cuitCuil: '30-12345678-9',
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const mockRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findEnabled: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentMethodsService,
        { provide: PaymentMethodsRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<PaymentMethodsService>(PaymentMethodsService);
    repository = module.get(PaymentMethodsRepository);
  });

  describe('findAll', () => {
    it('should return all payment methods', async () => {
      repository.findAll.mockResolvedValue([
        mockPaymentMethod,
        mockBankTransferMethod,
      ]);

      const result = await service.findAll(mockCtx);

      expect(result).toHaveLength(2);
      expect(repository.findAll).toHaveBeenCalledWith(mockCtx);
    });
  });

  describe('findById', () => {
    it('should return payment method by id', async () => {
      repository.findById.mockResolvedValue(mockPaymentMethod);

      const result = await service.findById(mockCtx, 'pm_123');

      expect(result).toEqual(mockPaymentMethod);
      expect(repository.findById).toHaveBeenCalledWith(mockCtx, 'pm_123');
    });

    it('should throw NotFoundException if method not found', async () => {
      repository.findById.mockResolvedValue(undefined);

      await expect(service.findById(mockCtx, 'pm_999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findEnabled', () => {
    it('should return only enabled payment methods', async () => {
      repository.findEnabled.mockResolvedValue([mockPaymentMethod]);

      const result = await service.findEnabled(mockCtx);

      expect(result).toHaveLength(1);
      expect(repository.findEnabled).toHaveBeenCalledWith(mockCtx);
    });
  });

  describe('getPublicPaymentMethods', () => {
    it('should return public payment methods with safe fields only', async () => {
      repository.findEnabled.mockResolvedValue([
        mockPaymentMethod,
        mockBankTransferMethod,
      ]);

      const result = await service.getPublicPaymentMethods(mockCtx);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'pm_123',
        name: 'Credit/Debit Card',
        type: 'payment_gateway',
        buyerCommissionPercent: 12,
        bankTransferConfig: undefined,
      });
      expect(result[1].bankTransferConfig).toBeDefined();
      expect((result[0] as PaymentMethodOption).gatewayConfigEnvPrefix).toBeUndefined();
    });
  });

  describe('create', () => {
    it('should create a payment gateway method', async () => {
      repository.create.mockImplementation(async (_, pm) => pm);

      const result = await service.create(mockCtx, {
        name: 'New MercadoPago',
        publicName: 'Credit/Debit Card (New)',
        type: 'payment_gateway',
        buyerCommissionPercent: 10,
        gatewayProvider: 'mercadopago',
        gatewayConfigEnvPrefix: 'MERCADOPAGO_NEW',
      });

      expect(result.name).toBe('New MercadoPago');
      expect(result.publicName).toBe('Credit/Debit Card (New)');
      expect(result.status).toBe('enabled');
      expect(result.id).toMatch(/^pm_/);
      expect(repository.create).toHaveBeenCalled();
    });

    it('should create a bank transfer method', async () => {
      repository.create.mockImplementation(async (_, pm) => pm);

      const result = await service.create(mockCtx, {
        name: 'Banco Galicia',
        publicName: 'Bank Transfer (Galicia)',
        type: 'manual_approval',
        buyerCommissionPercent: 5,
        bankTransferConfig: {
          cbu: '0170123456789012345678',
          accountHolderName: 'TicketsHub SA',
          bankName: 'Banco Galicia',
          cuitCuil: '30-12345678-9',
        },
      });

      expect(result.name).toBe('Banco Galicia');
      expect(result.publicName).toBe('Bank Transfer (Galicia)');
      expect(result.bankTransferConfig?.bankName).toBe('Banco Galicia');
    });

    it('should throw BadRequestException if gateway method missing provider', async () => {
      await expect(
        service.create(mockCtx, {
          name: 'Bad Gateway',
          publicName: 'Bad Gateway Public',
          type: 'payment_gateway',
          buyerCommissionPercent: 10,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if bank transfer missing config', async () => {
      await expect(
        service.create(mockCtx, {
          name: 'Bad Bank',
          publicName: 'Bad Bank Public',
          type: 'manual_approval',
          buyerCommissionPercent: 5,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update payment method', async () => {
      repository.findById.mockResolvedValue(mockPaymentMethod);
      repository.update.mockResolvedValue({
        ...mockPaymentMethod,
        name: 'Updated Name',
      });

      const result = await service.update(mockCtx, 'pm_123', {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
      expect(repository.update).toHaveBeenCalledWith(mockCtx, 'pm_123', {
        name: 'Updated Name',
      });
    });

    it('should throw NotFoundException if method not found', async () => {
      repository.findById.mockResolvedValue(undefined);

      await expect(
        service.update(mockCtx, 'pm_999', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete payment method', async () => {
      repository.delete.mockResolvedValue(true);

      await service.delete(mockCtx, 'pm_123');

      expect(repository.delete).toHaveBeenCalledWith(mockCtx, 'pm_123');
    });

    it('should throw NotFoundException if method not found', async () => {
      repository.delete.mockResolvedValue(false);

      await expect(service.delete(mockCtx, 'pm_999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('toggleStatus', () => {
    it('should toggle payment method status', async () => {
      repository.findById.mockResolvedValue(mockPaymentMethod);
      repository.update.mockResolvedValue({
        ...mockPaymentMethod,
        status: 'disabled',
      });

      const result = await service.toggleStatus(mockCtx, 'pm_123', 'disabled');

      expect(result.status).toBe('disabled');
    });
  });

  describe('getGatewayCredentials', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      process.env.MERCADOPAGO_MAIN_ACCESS_TOKEN = 'test_access_token';
      process.env.MERCADOPAGO_MAIN_PUBLIC_KEY = 'test_public_key';
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should load credentials from env using prefix', () => {
      const result = service.getGatewayCredentials(mockCtx, mockPaymentMethod);

      expect(result.accessToken).toBe('test_access_token');
      expect(result.publicKey).toBe('test_public_key');
    });

    it('should throw BadRequestException for non-gateway payment method', () => {
      expect(() =>
        service.getGatewayCredentials(mockCtx, mockBankTransferMethod),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no env prefix configured', () => {
      const methodWithoutPrefix: PaymentMethodOption = {
        ...mockPaymentMethod,
        gatewayConfigEnvPrefix: undefined,
      };

      expect(() =>
        service.getGatewayCredentials(mockCtx, methodWithoutPrefix),
      ).toThrow(BadRequestException);
    });
  });
});
