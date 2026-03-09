import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PaymentMethodsRepository } from '@/modules/payments/payment-methods.repository';
import type {
  PaymentMethodOption,
  PaymentMethodType,
  PaymentMethodStatus,
  PaymentGatewayProvider,
  BankTransferConfig,
} from '@/modules/payments/payments.domain';
import type { Ctx } from '@/common/types/context';
import {
  getTestPrismaClient,
  disconnectTestPrisma,
} from '../../setup/test-prisma.service';
import { truncateAllTables, createTestContext } from '../../setup/test-utils';

describe('PaymentMethodsRepository (Integration)', () => {
  let prisma: PrismaClient;
  let repository: PaymentMethodsRepository;
  let ctx: Ctx;

  const createValidPaymentMethod = (
    overrides?: Partial<PaymentMethodOption>,
  ): PaymentMethodOption => {
    const now = new Date();
    return {
      id: randomUUID(),
      name: `payment-method-${randomUUID().slice(0, 8)}`,
      publicName: `Payment Method ${randomUUID().slice(0, 8)}`,
      type: 'payment_gateway' as PaymentMethodType,
      status: 'enabled' as PaymentMethodStatus,
      buyerCommissionPercent: 2.5,
      gatewayProvider: 'mercadopago' as PaymentGatewayProvider,
      gatewayConfigEnvPrefix: 'MP_',
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  };

  const createBankTransferPaymentMethod = (
    overrides?: Partial<PaymentMethodOption>,
  ): PaymentMethodOption => {
    const now = new Date();
    const bankTransferConfig: BankTransferConfig = {
      cbu: '0000000000000000000000',
      accountHolderName: 'Test Account Holder',
      bankName: 'Test Bank',
      cuitCuil: '20-12345678-9',
    };
    return {
      id: randomUUID(),
      name: `bank-transfer-${randomUUID().slice(0, 8)}`,
      publicName: `Bank Transfer ${randomUUID().slice(0, 8)}`,
      type: 'manual_approval' as PaymentMethodType,
      status: 'enabled' as PaymentMethodStatus,
      buyerCommissionPercent: 0,
      bankTransferConfig,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  };

  beforeAll(async () => {
    prisma = await getTestPrismaClient();
    repository = new PaymentMethodsRepository(prisma as any);
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
    ctx = createTestContext();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  // ==================== create ====================
  describe('create', () => {
    it('should create a payment gateway payment method', async () => {
      const paymentMethod = createValidPaymentMethod();

      const result = await repository.create(ctx, paymentMethod);

      expect(result.id).toBe(paymentMethod.id);
      expect(result.name).toBe(paymentMethod.name);
      expect(result.publicName).toBe(paymentMethod.publicName);
      expect(result.type).toBe('payment_gateway');
      expect(result.status).toBe('enabled');
      expect(result.buyerCommissionPercent).toBe(2.5);
      expect(result.gatewayProvider).toBe('mercadopago');
      expect(result.gatewayConfigEnvPrefix).toBe('MP_');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a bank transfer payment method with config', async () => {
      const paymentMethod = createBankTransferPaymentMethod();

      const result = await repository.create(ctx, paymentMethod);

      expect(result.id).toBe(paymentMethod.id);
      expect(result.name).toBe(paymentMethod.name);
      expect(result.type).toBe('manual_approval');
      expect(result.bankTransferConfig).toEqual(
        paymentMethod.bankTransferConfig,
      );
    });

    it('should create a payment method with null commission', async () => {
      const paymentMethod = createValidPaymentMethod({
        buyerCommissionPercent: null,
      });

      const result = await repository.create(ctx, paymentMethod);

      expect(result.buyerCommissionPercent).toBe(0);
    });

    it('should create a disabled payment method', async () => {
      const paymentMethod = createValidPaymentMethod({
        status: 'disabled',
      });

      const result = await repository.create(ctx, paymentMethod);

      expect(result.status).toBe('disabled');
    });

    it('should persist created payment method in database', async () => {
      const paymentMethod = createValidPaymentMethod();
      await repository.create(ctx, paymentMethod);

      const dbRecord = await prisma.paymentMethod.findUnique({
        where: { id: paymentMethod.id },
      });

      expect(dbRecord).not.toBeNull();
      expect(dbRecord!.name).toBe(paymentMethod.name);
      expect(dbRecord!.type).toBe(paymentMethod.type);
      expect(dbRecord!.status).toBe(paymentMethod.status);
    });
  });

  // ==================== findAll ====================
  describe('findAll', () => {
    it('should return empty array when no payment methods exist', async () => {
      const result = await repository.findAll(ctx);

      expect(result).toEqual([]);
    });

    it('should return all payment methods', async () => {
      const method1 = createValidPaymentMethod();
      const method2 = createBankTransferPaymentMethod();
      await repository.create(ctx, method1);
      await repository.create(ctx, method2);

      const result = await repository.findAll(ctx);

      expect(result).toHaveLength(2);
      const ids = result.map((m) => m.id);
      expect(ids).toContain(method1.id);
      expect(ids).toContain(method2.id);
    });

    it('should return payment methods ordered by createdAt descending', async () => {
      const now = new Date();
      const method1 = createValidPaymentMethod({
        createdAt: new Date(now.getTime() - 10000),
      });
      const method2 = createValidPaymentMethod({
        createdAt: new Date(now.getTime() - 5000),
      });
      const method3 = createValidPaymentMethod({
        createdAt: now,
      });
      await repository.create(ctx, method1);
      await repository.create(ctx, method2);
      await repository.create(ctx, method3);

      const result = await repository.findAll(ctx);

      expect(result[0].id).toBe(method3.id);
      expect(result[1].id).toBe(method2.id);
      expect(result[2].id).toBe(method1.id);
    });

    it('should return both enabled and disabled payment methods', async () => {
      const enabledMethod = createValidPaymentMethod({ status: 'enabled' });
      const disabledMethod = createValidPaymentMethod({ status: 'disabled' });
      await repository.create(ctx, enabledMethod);
      await repository.create(ctx, disabledMethod);

      const result = await repository.findAll(ctx);

      expect(result).toHaveLength(2);
      const statuses = result.map((m) => m.status);
      expect(statuses).toContain('enabled');
      expect(statuses).toContain('disabled');
    });
  });

  // ==================== findById ====================
  describe('findById', () => {
    it('should return undefined when payment method does not exist', async () => {
      const result = await repository.findById(ctx, randomUUID());

      expect(result).toBeUndefined();
    });

    it('should return payment method when found', async () => {
      const paymentMethod = createValidPaymentMethod();
      await repository.create(ctx, paymentMethod);

      const result = await repository.findById(ctx, paymentMethod.id);

      expect(result).toBeDefined();
      expect(result!.id).toBe(paymentMethod.id);
      expect(result!.name).toBe(paymentMethod.name);
      expect(result!.type).toBe(paymentMethod.type);
    });

    it('should return payment method with all gateway fields', async () => {
      const paymentMethod = createValidPaymentMethod({
        gatewayProvider: 'uala_bis',
        gatewayConfigEnvPrefix: 'UALA_',
      });
      await repository.create(ctx, paymentMethod);

      const result = await repository.findById(ctx, paymentMethod.id);

      expect(result!.gatewayProvider).toBe('uala_bis');
      expect(result!.gatewayConfigEnvPrefix).toBe('UALA_');
    });

    it('should return payment method with bank transfer config', async () => {
      const paymentMethod = createBankTransferPaymentMethod();
      await repository.create(ctx, paymentMethod);

      const result = await repository.findById(ctx, paymentMethod.id);

      expect(result!.bankTransferConfig).toEqual(
        paymentMethod.bankTransferConfig,
      );
    });
  });

  // ==================== findEnabled ====================
  describe('findEnabled', () => {
    it('should return empty array when no enabled payment methods exist', async () => {
      const disabledMethod = createValidPaymentMethod({ status: 'disabled' });
      await repository.create(ctx, disabledMethod);

      const result = await repository.findEnabled(ctx);

      expect(result).toEqual([]);
    });

    it('should return only enabled payment methods', async () => {
      const enabledMethod1 = createValidPaymentMethod({ status: 'enabled' });
      const enabledMethod2 = createValidPaymentMethod({ status: 'enabled' });
      const disabledMethod = createValidPaymentMethod({ status: 'disabled' });
      await repository.create(ctx, enabledMethod1);
      await repository.create(ctx, enabledMethod2);
      await repository.create(ctx, disabledMethod);

      const result = await repository.findEnabled(ctx);

      expect(result).toHaveLength(2);
      const ids = result.map((m) => m.id);
      expect(ids).toContain(enabledMethod1.id);
      expect(ids).toContain(enabledMethod2.id);
      expect(ids).not.toContain(disabledMethod.id);
    });

    it('should return enabled payment methods ordered by createdAt descending', async () => {
      const now = new Date();
      const method1 = createValidPaymentMethod({
        status: 'enabled',
        createdAt: new Date(now.getTime() - 10000),
      });
      const method2 = createValidPaymentMethod({
        status: 'enabled',
        createdAt: now,
      });
      await repository.create(ctx, method1);
      await repository.create(ctx, method2);

      const result = await repository.findEnabled(ctx);

      expect(result[0].id).toBe(method2.id);
      expect(result[1].id).toBe(method1.id);
    });
  });

  // ==================== update ====================
  describe('update', () => {
    it('should return undefined when payment method does not exist', async () => {
      const result = await repository.update(ctx, randomUUID(), {
        name: 'new-name',
      });

      expect(result).toBeUndefined();
    });

    it('should update payment method name', async () => {
      const paymentMethod = createValidPaymentMethod();
      await repository.create(ctx, paymentMethod);

      const result = await repository.update(ctx, paymentMethod.id, {
        name: 'updated-name',
      });

      expect(result).toBeDefined();
      expect(result!.name).toBe('updated-name');
    });

    it('should update payment method status', async () => {
      const paymentMethod = createValidPaymentMethod({ status: 'enabled' });
      await repository.create(ctx, paymentMethod);

      const result = await repository.update(ctx, paymentMethod.id, {
        status: 'disabled',
      });

      expect(result!.status).toBe('disabled');
    });

    it('should update payment method type', async () => {
      const paymentMethod = createValidPaymentMethod({
        type: 'payment_gateway',
      });
      await repository.create(ctx, paymentMethod);

      const result = await repository.update(ctx, paymentMethod.id, {
        type: 'manual_approval',
      });

      expect(result!.type).toBe('manual_approval');
    });

    it('should update buyer commission percent', async () => {
      const paymentMethod = createValidPaymentMethod({
        buyerCommissionPercent: 2.5,
      });
      await repository.create(ctx, paymentMethod);

      const result = await repository.update(ctx, paymentMethod.id, {
        buyerCommissionPercent: 5.0,
      });

      expect(result!.buyerCommissionPercent).toBe(5.0);
    });

    it('should update gateway provider', async () => {
      const paymentMethod = createValidPaymentMethod({
        gatewayProvider: 'mercadopago',
      });
      await repository.create(ctx, paymentMethod);

      const result = await repository.update(ctx, paymentMethod.id, {
        gatewayProvider: 'payway',
      });

      expect(result!.gatewayProvider).toBe('payway');
    });

    it('should update gateway config env prefix', async () => {
      const paymentMethod = createValidPaymentMethod({
        gatewayConfigEnvPrefix: 'MP_',
      });
      await repository.create(ctx, paymentMethod);

      const result = await repository.update(ctx, paymentMethod.id, {
        gatewayConfigEnvPrefix: 'PW_',
      });

      expect(result!.gatewayConfigEnvPrefix).toBe('PW_');
    });

    it('should update bank transfer config', async () => {
      const paymentMethod = createBankTransferPaymentMethod();
      await repository.create(ctx, paymentMethod);

      const newConfig: BankTransferConfig = {
        cbu: '1111111111111111111111',
        accountHolderName: 'New Account Holder',
        bankName: 'New Bank',
        cuitCuil: '27-98765432-1',
      };

      const result = await repository.update(ctx, paymentMethod.id, {
        bankTransferConfig: newConfig,
      });

      expect(result!.bankTransferConfig).toEqual(newConfig);
    });

    it('should update public name', async () => {
      const paymentMethod = createValidPaymentMethod();
      await repository.create(ctx, paymentMethod);

      const result = await repository.update(ctx, paymentMethod.id, {
        publicName: 'New Public Name',
      });

      expect(result!.publicName).toBe('New Public Name');
    });

    it('should update multiple fields at once', async () => {
      const paymentMethod = createValidPaymentMethod();
      await repository.create(ctx, paymentMethod);

      const result = await repository.update(ctx, paymentMethod.id, {
        name: 'new-name',
        status: 'disabled',
        buyerCommissionPercent: 7.5,
        publicName: 'New Public Name',
      });

      expect(result!.name).toBe('new-name');
      expect(result!.status).toBe('disabled');
      expect(result!.buyerCommissionPercent).toBe(7.5);
      expect(result!.publicName).toBe('New Public Name');
    });

    it('should update updatedAt timestamp', async () => {
      const paymentMethod = createValidPaymentMethod();
      await repository.create(ctx, paymentMethod);
      const originalUpdatedAt = paymentMethod.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = await repository.update(ctx, paymentMethod.id, {
        name: 'updated-name',
      });

      expect(result!.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime(),
      );
    });

    it('should preserve existing instructions when updating other fields', async () => {
      const paymentMethod = createValidPaymentMethod({
        gatewayProvider: 'mercadopago',
        gatewayConfigEnvPrefix: 'MP_',
      });
      await repository.create(ctx, paymentMethod);

      const result = await repository.update(ctx, paymentMethod.id, {
        name: 'updated-name',
      });

      expect(result!.gatewayProvider).toBe('mercadopago');
      expect(result!.gatewayConfigEnvPrefix).toBe('MP_');
    });

    it('should set commission to 0 when updating to null', async () => {
      const paymentMethod = createValidPaymentMethod({
        buyerCommissionPercent: 5.0,
      });
      await repository.create(ctx, paymentMethod);

      const result = await repository.update(ctx, paymentMethod.id, {
        buyerCommissionPercent: null,
      });

      expect(result!.buyerCommissionPercent).toBe(0);
    });
  });

  // ==================== delete ====================
  describe('delete', () => {
    it('should return false when payment method does not exist', async () => {
      const result = await repository.delete(ctx, randomUUID());

      expect(result).toBe(false);
    });

    it('should delete existing payment method and return true', async () => {
      const paymentMethod = createValidPaymentMethod();
      await repository.create(ctx, paymentMethod);

      const result = await repository.delete(ctx, paymentMethod.id);

      expect(result).toBe(true);
    });

    it('should remove payment method from database', async () => {
      const paymentMethod = createValidPaymentMethod();
      await repository.create(ctx, paymentMethod);
      await repository.delete(ctx, paymentMethod.id);

      const dbRecord = await prisma.paymentMethod.findUnique({
        where: { id: paymentMethod.id },
      });

      expect(dbRecord).toBeNull();
    });

    it('should not affect other payment methods when deleting', async () => {
      const method1 = createValidPaymentMethod();
      const method2 = createValidPaymentMethod();
      await repository.create(ctx, method1);
      await repository.create(ctx, method2);

      await repository.delete(ctx, method1.id);

      const remaining = await repository.findAll(ctx);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(method2.id);
    });
  });

  // ==================== edge cases ====================
  describe('edge cases', () => {
    it('should handle payment method without optional fields', async () => {
      const paymentMethod = createValidPaymentMethod({
        gatewayProvider: undefined,
        gatewayConfigEnvPrefix: undefined,
        bankTransferConfig: undefined,
      });

      const result = await repository.create(ctx, paymentMethod);

      expect(result.gatewayProvider).toBeUndefined();
      expect(result.gatewayConfigEnvPrefix).toBeUndefined();
      expect(result.bankTransferConfig).toBeUndefined();
    });

    it('should handle all gateway providers', async () => {
      const providers: PaymentGatewayProvider[] = [
        'mercadopago',
        'uala_bis',
        'payway',
        'astropay',
      ];

      for (const provider of providers) {
        const paymentMethod = createValidPaymentMethod({
          gatewayProvider: provider,
        });
        const result = await repository.create(ctx, paymentMethod);
        expect(result.gatewayProvider).toBe(provider);
      }
    });

    it('should handle publicName defaulting to name when not in instructions', async () => {
      const paymentMethod = createValidPaymentMethod({
        publicName: undefined,
      });

      await prisma.paymentMethod.create({
        data: {
          id: paymentMethod.id,
          name: paymentMethod.name,
          type: paymentMethod.type,
          status: paymentMethod.status,
          commissionPercent: paymentMethod.buyerCommissionPercent ?? 0,
          commissionFixed: 0,
          instructions: {},
          requiredFields: [],
          createdAt: paymentMethod.createdAt,
          updatedAt: paymentMethod.updatedAt,
        },
      });

      const result = await repository.findById(ctx, paymentMethod.id);

      expect(result!.publicName).toBe(paymentMethod.name);
    });
  });
});
