# MercadoPago Checkout Pro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the MercadoPago Checkout Pro provider so buyers can pay via MercadoPago's hosted checkout page.

**Architecture:** The `MercadoPagoProvider` implements the existing `GatewayProvider` interface — the same interface used by `UalaBisProvider`. It stores the MP `preference_id` as `providerOrderId`. The webhook path has one extra step: MP sends a `paymentId`, so we fetch the payment first to get the `preference_id`, then hand off to the existing `handleOrderUpdate` flow.

**Tech Stack:** NestJS, TypeScript, native `fetch`, Jest for unit tests.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `backend/src/modules/gateways/providers/mercadopago.provider.ts` | Modify | Implement all 3 GatewayProvider methods + `fetchPayment` helper |
| `backend/src/modules/gateways/gateway-payments.service.ts` | Modify | Add `handleMercadoPagoWebhook` method |
| `backend/src/modules/gateways/gateway-webhooks.controller.ts` | Modify | Implement the placeholder MP webhook handler |
| `backend/test/unit/modules/gateways/mercadopago.provider.spec.ts` | Create | Unit tests for the provider |

Nothing else changes — module, repositories, config, and domain are already wired.

---

## Reference

- Spec: `docs/superpowers/specs/2026-03-24-mercadopago-checkout-pro-design.md`
- Pattern to follow: `backend/src/modules/gateways/providers/uala-bis.provider.ts`
- Existing test pattern: `backend/test/unit/modules/payments/payment-methods.service.spec.ts`
- Gateway service (to understand `handleOrderUpdate`): `backend/src/modules/gateways/gateway-payments.service.ts`
- Webhook controller: `backend/src/modules/gateways/gateway-webhooks.controller.ts`

---

## Task 1: Implement `MercadoPagoProvider`

**Files:**
- Modify: `backend/src/modules/gateways/providers/mercadopago.provider.ts`

- [ ] **Step 1: Replace the stub with the full implementation**

Replace the entire file content with:

```typescript
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentMethodsService } from '../../payments/payment-methods.service';
import { ContextLogger } from '../../../common/logger/context-logger';
import type { Ctx } from '../../../common/types/context';
import type {
  GatewayProvider,
  GatewayProviderOrder,
  GatewayProviderOrderStatus,
  GatewayProviderMoney,
} from './gateway-provider.interface';
import type { PaymentMethodOption } from '../../payments/payments.domain';

const MP_API = 'https://api.mercadopago.com';

interface MpPayment {
  id: number;
  status: string;
  preference_id: string;
}

interface MpMerchantOrder {
  payments: Array<{ id: number; status: string }>;
}

@Injectable()
export class MercadoPagoProvider implements GatewayProvider {
  private readonly logger = new ContextLogger(MercadoPagoProvider.name);

  constructor(
    private readonly paymentMethodsService: PaymentMethodsService,
    private readonly configService: ConfigService,
  ) {}

  private getAccessToken(paymentMethod: PaymentMethodOption): string {
    const creds = this.paymentMethodsService.getGatewayCredentials(
      { source: 'INTERNAL', requestId: 'mp-provider' } as Ctx,
      paymentMethod,
    );
    if (!creds.accessToken) {
      throw new BadRequestException(
        `MercadoPago access token not configured for payment method ${paymentMethod.id}`,
      );
    }
    return creds.accessToken;
  }

  private isProduction(): boolean {
    return this.configService.get<string>('app.environment') === 'production';
  }

  private mapStatus(mpStatus: string): GatewayProviderOrderStatus {
    switch (mpStatus) {
      case 'approved':
        return 'approved';
      case 'rejected':
      case 'cancelled':
        return 'rejected';
      case 'refunded':
      case 'charged_back':
        return 'refunded';
      default:
        return 'pending';
    }
  }

  private centsToDecimal(cents: number): number {
    return cents / 100;
  }

  private async getMerchantOrder(
    ctx: Ctx,
    preferenceId: string,
    accessToken: string,
  ): Promise<MpMerchantOrder | null> {
    const url = `${MP_API}/merchant_orders/search?preference_id=${encodeURIComponent(preferenceId)}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      this.logger.error(ctx, `MP merchant_orders search failed: ${response.status}`, err);
      throw new Error(`MP merchant_orders search failed: ${response.status}`);
    }

    const data = (await response.json()) as { elements?: MpMerchantOrder[] };
    return data.elements?.[0] ?? null;
  }

  async createOrder(
    ctx: Ctx,
    transactionId: string,
    amount: GatewayProviderMoney,
    description: string,
    paymentMethod: PaymentMethodOption,
  ): Promise<GatewayProviderOrder> {
    const accessToken = this.getAccessToken(paymentMethod);
    const publicUrl = this.configService.get<string>('app.publicUrl') ?? '';
    const backendUrl = this.configService.get<string>('app.backendUrl') ?? publicUrl;
    const transactionUrl = `${publicUrl}/transaction/${transactionId}`;

    const body = {
      items: [
        {
          title: description,
          quantity: 1,
          unit_price: this.centsToDecimal(amount.amount),
          currency_id: amount.currency,
        },
      ],
      external_reference: transactionId,
      notification_url: `${backendUrl}/api/payments/webhook/mercadopago`,
      back_urls: {
        success: transactionUrl,
        failure: transactionUrl,
        pending: transactionUrl,
      },
      auto_return: 'approved',
    };

    const response = await fetch(`${MP_API}/checkout/preferences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      this.logger.error(ctx, `MP create preference failed: ${response.status}`, err);
      throw new Error(`MP create preference failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      id: string;
      init_point: string;
      sandbox_init_point: string;
    };

    const checkoutUrl = this.isProduction() ? data.init_point : data.sandbox_init_point;

    this.logger.log(ctx, `MP preference created: ${data.id} for transaction ${transactionId}`);
    return { providerOrderId: data.id, checkoutUrl };
  }

  async getOrder(
    ctx: Ctx,
    preferenceId: string,
    paymentMethod: PaymentMethodOption,
  ): Promise<GatewayProviderOrderStatus> {
    const accessToken = this.getAccessToken(paymentMethod);
    const order = await this.getMerchantOrder(ctx, preferenceId, accessToken);

    if (!order || order.payments.length === 0) {
      return 'pending';
    }

    // Return the first non-pending resolved status
    for (const payment of order.payments) {
      const mapped = this.mapStatus(payment.status);
      if (mapped !== 'pending') {
        return mapped;
      }
    }
    return 'pending';
  }

  async refundOrder(
    ctx: Ctx,
    preferenceId: string,
    amount: GatewayProviderMoney,
    paymentMethod: PaymentMethodOption,
  ): Promise<void> {
    const accessToken = this.getAccessToken(paymentMethod);
    const order = await this.getMerchantOrder(ctx, preferenceId, accessToken);

    if (!order) {
      throw new NotFoundException(`No merchant order found for preference ${preferenceId}`);
    }

    const approvedPayment = order.payments.find((p) => p.status === 'approved');
    if (!approvedPayment) {
      throw new NotFoundException(`No approved payment found for preference ${preferenceId}`);
    }

    const refundBody = amount.amount > 0
      ? JSON.stringify({ amount: this.centsToDecimal(amount.amount) })
      : '{}';

    const response = await fetch(`${MP_API}/v1/payments/${approvedPayment.id}/refunds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: refundBody,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      this.logger.error(ctx, `MP refund failed: ${response.status} for preference ${preferenceId}`, err);
      throw new Error(`MP refund failed: ${response.status}`);
    }

    this.logger.log(ctx, `MP refund initiated for preference ${preferenceId}`);
  }

  /**
   * Fetches a payment by ID and returns its preference_id.
   * Used by the webhook handler to map paymentId → preferenceId → handleOrderUpdate.
   */
  async fetchPayment(
    ctx: Ctx,
    paymentId: string,
    paymentMethod: PaymentMethodOption,
  ): Promise<{ preferenceId: string }> {
    const accessToken = this.getAccessToken(paymentMethod);

    const response = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      this.logger.error(ctx, `MP fetch payment failed: ${response.status} for payment ${paymentId}`, err);
      throw new Error(`MP fetch payment failed: ${response.status}`);
    }

    const data = (await response.json()) as MpPayment;
    this.logger.debug(ctx, 'fetchPayment', { paymentId, preferenceId: data.preference_id });
    return { preferenceId: data.preference_id };
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors.

---

## Task 2: Unit tests for `MercadoPagoProvider`

**Files:**
- Create: `backend/test/unit/modules/gateways/mercadopago.provider.spec.ts`

- [ ] **Step 1: Create the test file**

```typescript
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

    it('returns pending when all payments are pending', async () => {
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
```

- [ ] **Step 2: Run the tests and verify they pass**

```bash
cd backend && npm test -- --testPathPattern="mercadopago.provider.spec"
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/gateways/providers/mercadopago.provider.ts \
        backend/test/unit/modules/gateways/mercadopago.provider.spec.ts
git commit -m "feat: implement MercadoPago Checkout Pro provider"
```

---

## Task 3: Add `handleMercadoPagoWebhook` to `GatewayPaymentsService`

**Files:**
- Modify: `backend/src/modules/gateways/gateway-payments.service.ts`

- [ ] **Step 1: Add the method after `pollPendingOrders`**

Note: `MercadoPagoProvider` is already imported in this file (line 12). No new imports needed.

Add this method after the `pollPendingOrders` method (around line 154):

```typescript
// ==================== handleMercadoPagoWebhook ====================

/**
 * Process a MercadoPago webhook notification.
 * MP sends a paymentId — we fetch the payment to get the preferenceId,
 * then hand off to the standard handleOrderUpdate flow.
 * Must be called OUTSIDE a DB transaction (makes a network call).
 */
async handleMercadoPagoWebhook(ctx: Ctx, paymentId: string): Promise<void> {
  const enabledMethods = await this.paymentMethodsService.findEnabled(ctx);
  const mpMethod = enabledMethods.find((m) => m.gatewayProvider === 'mercadopago');

  if (!mpMethod) {
    this.logger.error(ctx, `MP webhook received but no enabled MercadoPago payment method found`);
    return;
  }

  const { preferenceId } = await this.mercadoPagoProvider.fetchPayment(ctx, paymentId, mpMethod);
  this.logger.log(ctx, `MP webhook: paymentId ${paymentId} → preferenceId ${preferenceId}`);

  await this.handleOrderUpdate(ctx, preferenceId);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/gateways/gateway-payments.service.ts
git commit -m "feat: add handleMercadoPagoWebhook to GatewayPaymentsService"
```

---

## Task 4: Implement the MP webhook endpoint

**Files:**
- Modify: `backend/src/modules/gateways/gateway-webhooks.controller.ts`

- [ ] **Step 1: Replace the placeholder `handleMercadoPago` method**

Replace the existing placeholder implementation with:

```typescript
/**
 * MercadoPago webhook.
 * MP sends: { type: "payment", data: { id: "paymentId" }, ... }
 * We only act on type=payment; other types (e.g. "test") are acknowledged and ignored.
 * No signature validation — MP webhook secret not configured.
 */
@Post('mercadopago')
@HttpCode(HttpStatus.OK)
async handleMercadoPago(
  @Context() ctx: Ctx,
  @Body() body: Record<string, unknown>,
): Promise<{ received: boolean }> {
  const type = body['type'] as string | undefined;
  const dataId = (body['data'] as Record<string, unknown> | undefined)?.['id'] as string | undefined;

  if (type !== 'payment') {
    this.logger.log(ctx, `MP webhook received with type=${type ?? 'unknown'}, ignoring`);
    return { received: true };
  }

  if (!dataId) {
    this.logger.error(ctx, 'MP webhook missing data.id', body);
    return { received: true };
  }

  this.logger.log(ctx, `MP webhook received for payment ${dataId}`);

  await this.gatewayPaymentsService.handleMercadoPagoWebhook(ctx, dataId).catch((err) => {
    this.logger.error(ctx, `MP webhook processing failed for payment ${dataId}`, err);
  });

  return { received: true };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run all unit tests to verify nothing broke**

```bash
cd backend && npm test
```

Expected: all existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/gateways/gateway-webhooks.controller.ts
git commit -m "feat: implement MercadoPago webhook handler"
```

---

## Done

The integration is complete. Summary of what was implemented:

- `MercadoPagoProvider` — creates preferences, queries order status via merchant_orders, issues refunds, fetches payments for webhook mapping
- `GatewayPaymentsService.handleMercadoPagoWebhook` — bridges MP's paymentId to the existing handleOrderUpdate flow
- `GatewayWebhooksController.handleMercadoPago` — receives MP webhooks and delegates processing

The polling path (`GatewayPaymentsScheduler` → `pollPendingOrders` → `handleOrderUpdate` → `getOrder`) works automatically without any changes.
