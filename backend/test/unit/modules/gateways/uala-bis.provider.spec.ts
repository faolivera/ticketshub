import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UalaBisProvider } from '../../../../src/modules/gateways/providers/uala-bis.provider';
import { PaymentMethodsService } from '../../../../src/modules/payments/payment-methods.service';
import type { Ctx } from '../../../../src/common/types/context';
import type { PaymentMethodOption } from '../../../../src/modules/payments/payments.domain';
import type { GatewayProviderMoney } from '../../../../src/modules/gateways/providers/gateway-provider.interface';

const mockCtx: Ctx = { source: 'HTTP', requestId: 'test-req' };

const mockPaymentMethod: PaymentMethodOption = {
  id: 'pm_uala_1',
  name: 'Ualá Bis',
  publicName: 'Ualá Bis',
  type: 'payment_gateway',
  status: 'enabled',
  visible: true,
  buyerCommissionPercent: 5,
  gatewayProvider: 'uala_bis',
  gatewayConfigEnvPrefix: 'UALA_BIS_MAIN',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockAmount: GatewayProviderMoney = { amount: 15000, currency: 'ARS' }; // 150.00

describe('UalaBisProvider', () => {
  let provider: UalaBisProvider;
  let paymentMethodsService: jest.Mocked<PaymentMethodsService>;
  let configService: jest.Mocked<ConfigService>;
  let fetchMock: jest.Mock;

  beforeEach(async () => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;

    const mockPaymentMethodsService = {
      getGatewayCredentials: jest.fn().mockReturnValue({
        username: 'test_user',
        clientId: 'test_client_id',
        clientSecretId: 'test_secret',
      }),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'app.environment') return 'staging';
        if (key === 'app.frontendBaseUrl') return 'https://frontend.example.com';
        if (key === 'app.baseUrl') return 'https://api.example.com';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UalaBisProvider,
        { provide: PaymentMethodsService, useValue: mockPaymentMethodsService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    provider = module.get(UalaBisProvider);
    paymentMethodsService = module.get(PaymentMethodsService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ==================== getToken / fetchToken ====================

  describe('getToken (via createOrder)', () => {
    it('fetches and caches a token on first call', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'tok_abc', expires_in: 3600 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            uuid: 'order-uuid',
            links: { checkout_link: 'https://checkout.example.com/pay' },
          }),
        });

      await provider.createOrder(mockCtx, 'txn_1', mockAmount, 'Concert ticket', mockPaymentMethod);

      // Only one auth call
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[0][0]).toContain('/token');
    });

    it('reuses cached token on second call without re-fetching', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'tok_cached', expires_in: 3600 }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            uuid: 'order-uuid',
            links: { checkout_link: 'https://checkout.example.com/pay' },
          }),
        });

      await provider.createOrder(mockCtx, 'txn_1', mockAmount, 'desc', mockPaymentMethod);
      await provider.createOrder(mockCtx, 'txn_2', mockAmount, 'desc', mockPaymentMethod);

      // Auth called once, checkout called twice
      const authCalls = fetchMock.mock.calls.filter((c: string[]) =>
        (c[0] as string).includes('/token'),
      );
      expect(authCalls).toHaveLength(1);
    });

    it('throws when auth fails', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'unauthorized' }),
      });

      await expect(
        provider.createOrder(mockCtx, 'txn_1', mockAmount, 'desc', mockPaymentMethod),
      ).rejects.toThrow('Ualá authentication failed: 401');
    });
  });

  // ==================== createOrder ====================

  describe('createOrder', () => {
    beforeEach(() => {
      // Auth succeeds first
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'tok', expires_in: 3600 }),
      });
    });

    it('returns providerOrderId and checkoutUrl on success', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          uuid: 'order-uuid-123',
          links: { checkout_link: 'https://checkout.example.com/pay/order-uuid-123' },
        }),
      });

      const result = await provider.createOrder(
        mockCtx,
        'txn_1',
        mockAmount,
        'Concert ticket',
        mockPaymentMethod,
      );

      expect(result.providerOrderId).toBe('order-uuid-123');
      expect(result.checkoutUrl).toBe('https://checkout.example.com/pay/order-uuid-123');
    });

    it('sends amount as decimal string with 2 decimal places', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          uuid: 'order-uuid',
          links: { checkout_link: 'https://checkout.example.com/pay' },
        }),
      });

      await provider.createOrder(mockCtx, 'txn_1', { amount: 15000, currency: 'ARS' }, 'desc', mockPaymentMethod);

      const checkoutCall = fetchMock.mock.calls[1];
      const body = JSON.parse(checkoutCall[1].body as string);
      expect(body.amount).toBe('150.00');
    });

    it('includes external_reference and notification_url in request body', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          uuid: 'order-uuid',
          links: { checkout_link: 'https://checkout.example.com/pay' },
        }),
      });

      await provider.createOrder(mockCtx, 'txn_abc', mockAmount, 'desc', mockPaymentMethod);

      const checkoutCall = fetchMock.mock.calls[1];
      const body = JSON.parse(checkoutCall[1].body as string);
      expect(body.external_reference).toBe('txn_abc');
      expect(body.notification_url).toContain('/api/payments/webhook/uala-bis');
    });

    it('throws when order creation fails', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({ message: 'invalid amount' }),
      });

      await expect(
        provider.createOrder(mockCtx, 'txn_1', mockAmount, 'desc', mockPaymentMethod),
      ).rejects.toThrow('Ualá order creation failed: 422');
    });
  });

  // ==================== getOrder ====================

  describe('getOrder', () => {
    beforeEach(() => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'tok', expires_in: 3600 }),
      });
    });

    it.each([
      ['APPROVED', 'approved'],
      ['PROCESSED', 'approved'],
      ['REJECTED', 'rejected'],
      ['REFUNDED', 'refunded'],
      ['PENDING', 'pending'],
      ['UNKNOWN_STATUS', 'pending'],
    ])('maps Ualá status %s to %s', async (ualaStatus, expected) => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: ualaStatus }),
      });

      const result = await provider.getOrder(mockCtx, 'order-uuid', mockPaymentMethod);
      expect(result).toBe(expected);
    });

    it('throws when get order fails', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({}),
      });

      await expect(
        provider.getOrder(mockCtx, 'order-uuid', mockPaymentMethod),
      ).rejects.toThrow('Ualá get order failed: 404');
    });
  });

  // ==================== refundOrder ====================

  describe('refundOrder', () => {
    beforeEach(() => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'tok', expires_in: 3600 }),
      });
    });

    it('sends correct amount and notification_url', async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      await provider.refundOrder(mockCtx, 'order-uuid', { amount: 5000, currency: 'ARS' }, mockPaymentMethod);

      const refundCall = fetchMock.mock.calls[1];
      const body = JSON.parse(refundCall[1].body as string);
      expect(body.amount).toBe('50.00');
      expect(body.notification_url).toContain('/api/payments/webhook/uala-bis');
    });

    it('calls the correct refund endpoint', async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      await provider.refundOrder(mockCtx, 'order-uuid-xyz', mockAmount, mockPaymentMethod);

      const refundCall = fetchMock.mock.calls[1];
      expect(refundCall[0]).toContain('/orders/order-uuid-xyz/refund');
    });

    it('throws when refund fails', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'already refunded' }),
      });

      await expect(
        provider.refundOrder(mockCtx, 'order-uuid', mockAmount, mockPaymentMethod),
      ).rejects.toThrow('Ualá refund failed: 400');
    });
  });

  // ==================== staging vs production URLs ====================

  describe('URL selection', () => {
    it('uses staging URLs when environment is not production', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'tok', expires_in: 3600 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            uuid: 'order-uuid',
            links: { checkout_link: 'https://staging.checkout.com' },
          }),
        });

      await provider.createOrder(mockCtx, 'txn_1', mockAmount, 'desc', mockPaymentMethod);

      expect(fetchMock.mock.calls[0][0]).toContain('stage.developers.ar.ua.la');
    });

    it('uses production URLs when environment is production', async () => {
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'app.environment') return 'prod';
        if (key === 'app.frontendBaseUrl') return 'https://frontend.example.com';
        if (key === 'app.baseUrl') return 'https://api.example.com';
        return undefined;
      });

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'tok', expires_in: 3600 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            uuid: 'order-uuid',
            links: { checkout_link: 'https://checkout.com' },
          }),
        });

      await provider.createOrder(mockCtx, 'txn_1', mockAmount, 'desc', mockPaymentMethod);

      expect(fetchMock.mock.calls[0][0]).not.toContain('stage');
      expect(fetchMock.mock.calls[0][0]).toContain('developers.ar.ua.la');
    });
  });
});
