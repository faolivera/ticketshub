import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MercadoPagoProvider } from '../../../../src/modules/gateways/providers/mercadopago.provider';
import { PaymentMethodsService } from '../../../../src/modules/payments/payment-methods.service';
import type { PaymentMethodOption } from '../../../../src/modules/payments/payments.domain';
import type { GatewayProviderMoney } from '../../../../src/modules/gateways/providers/gateway-provider.interface';
import type { Ctx } from '../../../../src/common/types/context';

const mockCtx: Ctx = { source: 'HTTP', requestId: 'test-req' };

const mockPaymentMethod: PaymentMethodOption = {
  id: 'pm_mp1',
  name: 'MercadoPago',
  publicName: 'Tarjeta / MP',
  type: 'payment_gateway',
  status: 'enabled',
  visible: true,
  buyerCommissionPercent: 12,
  gatewayProvider: 'mercadopago',
  gatewayConfigEnvPrefix: 'MERCADOPAGO_MAIN',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAmount: GatewayProviderMoney = { amount: 10000, currency: 'ARS' }; // $100.00

describe('MercadoPagoProvider', () => {
  let provider: MercadoPagoProvider;
  let paymentMethodsService: jest.Mocked<PaymentMethodsService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockPaymentMethodsService = {
      getGatewayCredentials: jest.fn().mockReturnValue({ accessToken: 'test-token' }),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'app.environment') return 'staging';
        if (key === 'app.publicUrl') return 'https://ticketshub.com.ar';
        if (key === 'app.backendUrl') return 'https://api.ticketshub.com.ar';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MercadoPagoProvider,
        { provide: PaymentMethodsService, useValue: mockPaymentMethodsService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    provider = module.get<MercadoPagoProvider>(MercadoPagoProvider);
    paymentMethodsService = module.get(PaymentMethodsService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── createOrder ──────────────────────────────────────────────────────────

  describe('createOrder', () => {
    it('returns providerOrderId and sandbox_init_point in non-production', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'pref_123',
          init_point: 'https://mp.com/checkout/prod',
          sandbox_init_point: 'https://sandbox.mp.com/checkout',
        }),
      }) as jest.Mock;

      const result = await provider.createOrder(
        mockCtx,
        'txn_abc',
        mockAmount,
        'Entrada Lollapalooza',
        mockPaymentMethod,
      );

      expect(result.providerOrderId).toBe('pref_123');
      expect(result.checkoutUrl).toBe('https://sandbox.mp.com/checkout');
    });

    it('returns init_point in production', async () => {
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'app.environment') return 'production';
        if (key === 'app.publicUrl') return 'https://ticketshub.com.ar';
        if (key === 'app.backendUrl') return 'https://api.ticketshub.com.ar';
        return undefined;
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'pref_prod',
          init_point: 'https://mp.com/checkout/prod',
          sandbox_init_point: 'https://sandbox.mp.com/checkout',
        }),
      }) as jest.Mock;

      const result = await provider.createOrder(mockCtx, 'txn_abc', mockAmount, 'desc', mockPaymentMethod);

      expect(result.checkoutUrl).toBe('https://mp.com/checkout/prod');
    });

    it('throws when MP API returns non-2xx', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized' }),
      }) as jest.Mock;

      await expect(
        provider.createOrder(mockCtx, 'txn_abc', mockAmount, 'desc', mockPaymentMethod),
      ).rejects.toThrow('MP create preference failed: 401');
    });

    it('throws BadRequestException when access_token is missing', async () => {
      (paymentMethodsService.getGatewayCredentials as jest.Mock).mockReturnValue({});

      await expect(
        provider.createOrder(mockCtx, 'txn_abc', mockAmount, 'desc', mockPaymentMethod),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── getOrder ─────────────────────────────────────────────────────────────

  describe('getOrder', () => {
    it('returns approved when a payment is approved', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          elements: [{ payments: [{ id: 1, status: 'approved' }] }],
        }),
      }) as jest.Mock;

      const result = await provider.getOrder(mockCtx, 'pref_123', mockPaymentMethod);

      expect(result).toBe('approved');
    });

    it('returns rejected when payment is rejected', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          elements: [{ payments: [{ id: 1, status: 'rejected' }] }],
        }),
      }) as jest.Mock;

      const result = await provider.getOrder(mockCtx, 'pref_123', mockPaymentMethod);

      expect(result).toBe('rejected');
    });

    it('returns pending when no payments exist', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ elements: [] }),
      }) as jest.Mock;

      const result = await provider.getOrder(mockCtx, 'pref_123', mockPaymentMethod);

      expect(result).toBe('pending');
    });

    it('returns pending when all payments are in_process', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          elements: [{ payments: [{ id: 1, status: 'in_process' }] }],
        }),
      }) as jest.Mock;

      const result = await provider.getOrder(mockCtx, 'pref_123', mockPaymentMethod);

      expect(result).toBe('pending');
    });

    it('throws when merchant_orders API returns non-2xx', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      }) as jest.Mock;

      await expect(
        provider.getOrder(mockCtx, 'pref_123', mockPaymentMethod),
      ).rejects.toThrow('MP merchant_orders search failed: 500');
    });
  });

  // ── refundOrder ──────────────────────────────────────────────────────────

  describe('refundOrder', () => {
    it('calls refund endpoint with amount for partial refund', async () => {
      const fetchMock = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            elements: [{ payments: [{ id: 99, status: 'approved' }] }],
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      global.fetch = fetchMock as jest.Mock;

      await provider.refundOrder(mockCtx, 'pref_123', { amount: 5000, currency: 'ARS' }, mockPaymentMethod);

      expect(fetchMock).toHaveBeenCalledTimes(2);
      const [refundUrl, refundOptions] = fetchMock.mock.calls[1];
      expect(refundUrl).toContain('/v1/payments/99/refunds');
      expect(JSON.parse(refundOptions.body)).toEqual({ amount: 50 });
    });

    it('sends empty body for full refund (amount 0)', async () => {
      const fetchMock = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            elements: [{ payments: [{ id: 77, status: 'approved' }] }],
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      global.fetch = fetchMock as jest.Mock;

      await provider.refundOrder(mockCtx, 'pref_123', { amount: 0, currency: 'ARS' }, mockPaymentMethod);

      const [, refundOptions] = fetchMock.mock.calls[1];
      expect(JSON.parse(refundOptions.body)).toEqual({});
    });

    it('throws NotFoundException when no approved payment exists', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          elements: [{ payments: [{ id: 1, status: 'pending' }] }],
        }),
      }) as jest.Mock;

      await expect(
        provider.refundOrder(mockCtx, 'pref_123', mockAmount, mockPaymentMethod),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when no merchant order found', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ elements: [] }),
      }) as jest.Mock;

      await expect(
        provider.refundOrder(mockCtx, 'pref_123', mockAmount, mockPaymentMethod),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws when MP refund API returns non-2xx', async () => {
      const fetchMock = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            elements: [{ payments: [{ id: 77, status: 'approved' }] }],
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({}),
        });

      global.fetch = fetchMock as jest.Mock;

      await expect(
        provider.refundOrder(mockCtx, 'pref_123', mockAmount, mockPaymentMethod),
      ).rejects.toThrow('MP refund failed: 500');
    });
  });

  // ── fetchPayment ─────────────────────────────────────────────────────────

  describe('fetchPayment', () => {
    it('returns preferenceId from payment', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 42,
          status: 'approved',
          preference_id: 'pref_xyz',
        }),
      }) as jest.Mock;

      const result = await provider.fetchPayment(mockCtx, '42', mockPaymentMethod);

      expect(result.preferenceId).toBe('pref_xyz');
    });

    it('throws when MP API returns non-2xx', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({}),
      }) as jest.Mock;

      await expect(
        provider.fetchPayment(mockCtx, '42', mockPaymentMethod),
      ).rejects.toThrow('MP fetch payment failed: 404');
    });
  });
});
