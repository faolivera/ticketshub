# Gateway Payments Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the backend infrastructure to process charges via Ualá Bis (payment gateway), including order creation, webhook handling, polling, and refund processing — with MercadoPago scaffolded as a skeleton.

**Architecture:** A new `GatewaysModule` contains a dispatcher (`GatewayPaymentsService`), two schedulers (polling + refunds), and provider implementations. `TransactionsService` delegates to the dispatcher when the payment method type is `payment_gateway`. All multi-entity DB operations use the existing `TransactionManager`.

**Tech Stack:** NestJS, Prisma, TypeScript, `@nestjs/schedule` for cron jobs, `DistributedLockService` for multi-instance safety, `axios` or native `fetch` for HTTP calls to Ualá API.

---

## File Map

**New files:**
- `backend/src/modules/gateways/gateways.module.ts`
- `backend/src/modules/gateways/gateway-payments.service.ts`
- `backend/src/modules/gateways/gateway-payments.scheduler.ts`
- `backend/src/modules/gateways/gateway-refunds.scheduler.ts`
- `backend/src/modules/gateways/providers/gateway-provider.interface.ts`
- `backend/src/modules/gateways/providers/uala-bis.provider.ts`
- `backend/src/modules/gateways/providers/mercadopago.provider.ts`
- `backend/src/modules/gateways/gateway-orders.repository.ts`
- `backend/src/modules/gateways/gateway-orders.repository.interface.ts`
- `backend/src/modules/gateways/gateway-refunds.repository.ts`
- `backend/src/modules/gateways/gateway-refunds.repository.interface.ts`
- `backend/src/modules/gateways/gateways.domain.ts`
- `backend/test/unit/modules/gateways/gateway-payments.service.spec.ts`
- `backend/test/unit/modules/gateways/uala-bis.provider.spec.ts`
- `backend/test/unit/modules/gateways/gateway-payments.scheduler.spec.ts`
- `backend/test/unit/modules/gateways/gateway-refunds.scheduler.spec.ts`
- `backend/test/unit/modules/gateways/webhook.controller.spec.ts`

**Modified files:**
- `backend/prisma/schema.prisma` — add `GatewayOrder` and `GatewayRefund` models
- `backend/src/modules/payments/payment-methods.service.ts` — fix `uala_bis` credential keys
- `backend/src/modules/payments/payments.module.ts` — import `GatewaysModule`
- `backend/src/modules/payments/payments.controller.ts` — add webhook endpoints
- `backend/src/modules/transactions/transactions.service.ts` — call `GatewayPaymentsService` for gateway methods, call `handleTransactionCancelled` in cancel flow
- `backend/src/modules/transactions/transactions.module.ts` — import `GatewaysModule`

---

## Task 1: Fix Ualá Bis credential keys in `PaymentMethodsService`

**Files:**
- Modify: `backend/src/modules/payments/payment-methods.service.ts:185-200`
- Test: `backend/test/unit/modules/payments/payment-methods.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Add to `payment-methods.service.spec.ts` inside the `getGatewayCredentials` describe block:

```ts
it('should load USERNAME, CLIENT_ID, CLIENT_SECRET_ID for uala_bis', () => {
  const method: PaymentMethodOption = {
    ...mockPaymentMethod,
    gatewayProvider: 'uala_bis',
    gatewayConfigEnvPrefix: 'UALA_PROD',
  };
  configService.get.mockReturnValue({
    UALA_PROD_USERNAME: 'myuser',
    UALA_PROD_CLIENT_ID: 'myclientid',
    UALA_PROD_CLIENT_SECRET_ID: 'mysecret',
  });
  const creds = service.getGatewayCredentials(mockCtx, method);
  expect(creds.username).toBe('myuser');
  expect(creds.clientId).toBe('myclientid');
  expect(creds.clientSecretId).toBe('mysecret');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest test/unit/modules/payments/payment-methods.service.spec.ts --testNamePattern="uala_bis" -t "USERNAME"
```

Expected: FAIL — credentials are undefined because the key list returns `['AUTH_TOKEN']`.

- [ ] **Step 3: Update credential keys for `uala_bis`**

In `backend/src/modules/payments/payment-methods.service.ts`, update `getCredentialKeysForProvider`:

```ts
case 'uala_bis':
  return ['USERNAME', 'CLIENT_ID', 'CLIENT_SECRET_ID'];
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && npx jest test/unit/modules/payments/payment-methods.service.spec.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/payments/payment-methods.service.ts backend/test/unit/modules/payments/payment-methods.service.spec.ts
git commit -m "fix: update uala_bis credential keys to USERNAME, CLIENT_ID, CLIENT_SECRET_ID"
```

---

## Task 2: Add Prisma models for `GatewayOrder` and `GatewayRefund`

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add models to `schema.prisma`**

Add after the `PaymentIntent` model (around line 668):

```prisma
model GatewayOrder {
  id              String   @id
  transactionId   String   @unique
  paymentMethodId String
  provider        String
  providerOrderId String   @unique
  checkoutUrl     String   @db.Text
  status          String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  transaction Transaction    @relation(fields: [transactionId], references: [id])
  refunds     GatewayRefund[]

  @@index([status])
  @@index([transactionId, status])
  @@map("gateway_orders")
}

model GatewayRefund {
  id              String   @id
  transactionId   String
  gatewayOrderId  String
  providerOrderId String
  paymentMethodId String
  provider        String
  amount          Int
  currency        String
  status          String
  apiCallLog      Json?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  transaction  Transaction  @relation(fields: [transactionId], references: [id])
  gatewayOrder GatewayOrder @relation(fields: [gatewayOrderId], references: [id])

  @@index([status])
  @@map("gateway_refunds")
}
```

Also add the reverse relations on `Transaction` model:
```prisma
gatewayOrder   GatewayOrder?
gatewayRefunds GatewayRefund[]
```

- [ ] **Step 2: Generate migration**

```bash
cd backend && npx prisma migrate dev --name add_gateway_orders_and_refunds
```

Expected: migration file created in `prisma/migrations/`, Prisma client regenerated.

- [ ] **Step 3: Verify Prisma client compiles**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat: add GatewayOrder and GatewayRefund Prisma models"
```

---

## Task 3: Define domain types and provider interface

**Files:**
- Create: `backend/src/modules/gateways/gateways.domain.ts`
- Create: `backend/src/modules/gateways/providers/gateway-provider.interface.ts`

- [ ] **Step 1: Create `gateways.domain.ts`**

```ts
// backend/src/modules/gateways/gateways.domain.ts
import type { Ctx } from '../../common/types/context';
import type { TxCtx } from '../../common/database/types';

export type GatewayOrderStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'refunded'
  | 'cancelled';

export interface GatewayOrderRecord {
  id: string;
  transactionId: string;
  paymentMethodId: string;
  provider: string;
  providerOrderId: string;
  checkoutUrl: string;
  status: GatewayOrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface GatewayRefundRecord {
  id: string;
  transactionId: string;
  gatewayOrderId: string;
  providerOrderId: string;
  paymentMethodId: string; // needed by scheduler to load provider credentials
  provider: string;
  amount: number; // cents
  currency: string;
  status: 'Pending' | 'Processing' | 'Processed' | 'Failed';
  apiCallLog?: GatewayApiCallLog;
  createdAt: Date;
  updatedAt: Date;
}

export interface GatewayApiCallLog {
  timestamp: string;
  endpoint: string;
  requestBody: Record<string, unknown>;
  responseBody: Record<string, unknown>;
  httpStatus: number;
}
```

- [ ] **Step 2: Create `gateway-provider.interface.ts`**

```ts
// backend/src/modules/gateways/providers/gateway-provider.interface.ts
import type { Ctx } from '../../../common/types/context';

export interface GatewayProviderOrder {
  providerOrderId: string;
  checkoutUrl: string;
}

export type GatewayProviderOrderStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'refunded'
  | 'cancelled';

export interface GatewayProviderMoney {
  amount: number; // cents
  currency: string;
}

export interface GatewayProvider {
  createOrder(
    ctx: Ctx,
    transactionId: string,
    amount: GatewayProviderMoney,
    description: string,
  ): Promise<GatewayProviderOrder>;

  getOrder(
    ctx: Ctx,
    providerOrderId: string,
  ): Promise<GatewayProviderOrderStatus>;

  refundOrder(
    ctx: Ctx,
    providerOrderId: string,
    amount: GatewayProviderMoney,
  ): Promise<void>;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/gateways/
git commit -m "feat: add gateway domain types and provider interface"
```

---

## Task 4: Implement repository interfaces and in-memory repositories

**Files:**
- Create: `backend/src/modules/gateways/gateway-orders.repository.interface.ts`
- Create: `backend/src/modules/gateways/gateway-refunds.repository.interface.ts`
- Create: `backend/src/modules/gateways/gateway-orders.repository.ts`
- Create: `backend/src/modules/gateways/gateway-refunds.repository.ts`

- [ ] **Step 1: Create `gateway-orders.repository.interface.ts`**

```ts
// backend/src/modules/gateways/gateway-orders.repository.interface.ts
import type { Ctx } from '../../common/types/context';
import type { GatewayOrderRecord, GatewayOrderStatus } from './gateways.domain';

export const GATEWAY_ORDERS_REPOSITORY = Symbol('GATEWAY_ORDERS_REPOSITORY');

export interface IGatewayOrdersRepository {
  create(ctx: Ctx, order: GatewayOrderRecord): Promise<void>;
  findByTransactionId(ctx: Ctx, transactionId: string): Promise<GatewayOrderRecord | null>;
  findByProviderOrderId(ctx: Ctx, providerOrderId: string): Promise<GatewayOrderRecord | null>;
  findByProviderOrderIdForUpdate(ctx: Ctx, providerOrderId: string): Promise<GatewayOrderRecord | null>;
  findPendingWithPendingPaymentTransaction(ctx: Ctx): Promise<GatewayOrderRecord[]>;
  updateStatus(ctx: Ctx, id: string, status: GatewayOrderStatus): Promise<void>;
}
```

- [ ] **Step 2: Create `gateway-refunds.repository.interface.ts`**

```ts
// backend/src/modules/gateways/gateway-refunds.repository.interface.ts
import type { Ctx } from '../../common/types/context';
import type { GatewayRefundRecord, GatewayApiCallLog } from './gateways.domain';

export const GATEWAY_REFUNDS_REPOSITORY = Symbol('GATEWAY_REFUNDS_REPOSITORY');

export interface IGatewayRefundsRepository {
  create(ctx: Ctx, refund: GatewayRefundRecord): Promise<void>;
  findPending(ctx: Ctx): Promise<GatewayRefundRecord[]>;
  updateStatus(
    ctx: Ctx,
    id: string,
    status: 'Processing' | 'Processed' | 'Failed',
    apiCallLog?: GatewayApiCallLog,
  ): Promise<void>;
}
```

- [ ] **Step 3: Create `gateway-orders.repository.ts` (Prisma implementation)**

```ts
// backend/src/modules/gateways/gateway-orders.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TransactionManager } from '../../common/database/transaction-manager';
import type { IGatewayOrdersRepository } from './gateway-orders.repository.interface';
import type { GatewayOrderRecord, GatewayOrderStatus } from './gateways.domain';
import type { Ctx } from '../../common/types/context';

@Injectable()
export class GatewayOrdersRepository implements IGatewayOrdersRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly txManager: TransactionManager,
  ) {}

  private get client() {
    return this.prisma;
  }

  private getClient(ctx: Ctx) {
    return this.txManager.getClient(ctx);
  }

  async create(ctx: Ctx, order: GatewayOrderRecord): Promise<void> {
    const client = this.getClient(ctx);
    await client.gatewayOrder.create({ data: order });
  }

  async findByTransactionId(ctx: Ctx, transactionId: string): Promise<GatewayOrderRecord | null> {
    const client = this.getClient(ctx);
    return client.gatewayOrder.findUnique({ where: { transactionId } }) as Promise<GatewayOrderRecord | null>;
  }

  async findByProviderOrderId(ctx: Ctx, providerOrderId: string): Promise<GatewayOrderRecord | null> {
    const client = this.getClient(ctx);
    return client.gatewayOrder.findUnique({ where: { providerOrderId } }) as Promise<GatewayOrderRecord | null>;
  }

  async findByProviderOrderIdForUpdate(ctx: Ctx, providerOrderId: string): Promise<GatewayOrderRecord | null> {
    // Row lock via raw SQL. Prisma maps providerOrderId → provider_order_id (snake_case).
    const client = this.getClient(ctx);
    const results = await (client as any).$queryRaw`
      SELECT * FROM gateway_orders WHERE provider_order_id = ${providerOrderId} FOR UPDATE
    `;
    return results[0] ?? null;
  }

  async findPendingWithPendingPaymentTransaction(ctx: Ctx): Promise<GatewayOrderRecord[]> {
    const client = this.getClient(ctx);
    return client.gatewayOrder.findMany({
      where: {
        status: 'pending',
        transaction: { status: 'PendingPayment' },
      },
    }) as Promise<GatewayOrderRecord[]>;
  }

  async updateStatus(ctx: Ctx, id: string, status: GatewayOrderStatus): Promise<void> {
    const client = this.getClient(ctx);
    await client.gatewayOrder.update({ where: { id }, data: { status } });
  }
}
```

- [ ] **Step 4: Create `gateway-refunds.repository.ts` (Prisma implementation)**

```ts
// backend/src/modules/gateways/gateway-refunds.repository.ts
import { Injectable } from '@nestjs/common';
import { TransactionManager } from '../../common/database/transaction-manager';
import type { IGatewayRefundsRepository } from './gateway-refunds.repository.interface';
import type { GatewayRefundRecord, GatewayApiCallLog } from './gateways.domain';
import type { Ctx } from '../../common/types/context';

@Injectable()
export class GatewayRefundsRepository implements IGatewayRefundsRepository {
  constructor(private readonly txManager: TransactionManager) {}

  private getClient(ctx: Ctx) {
    return this.txManager.getClient(ctx);
  }

  async create(ctx: Ctx, refund: GatewayRefundRecord): Promise<void> {
    const client = this.getClient(ctx);
    await client.gatewayRefund.create({ data: { ...refund, apiCallLog: undefined } });
  }

  async findPending(ctx: Ctx): Promise<GatewayRefundRecord[]> {
    const client = this.getClient(ctx);
    const rows = await client.gatewayRefund.findMany({ where: { status: 'Pending' } });
    return rows.map((r: any) => ({ ...r, apiCallLog: r.apiCallLog ?? undefined }));
  }

  async updateStatus(
    ctx: Ctx,
    id: string,
    status: 'Processing' | 'Processed' | 'Failed',
    apiCallLog?: GatewayApiCallLog,
  ): Promise<void> {
    const client = this.getClient(ctx);
    await client.gatewayRefund.update({
      where: { id },
      data: { status, ...(apiCallLog ? { apiCallLog } : {}) },
    });
  }
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/gateways/
git commit -m "feat: add gateway orders and refunds repository interfaces and implementations"
```

---

## Task 5: Implement `UalaBisProvider`

**Files:**
- Create: `backend/src/modules/gateways/providers/uala-bis.provider.ts`
- Test: `backend/test/unit/modules/gateways/uala-bis.provider.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `backend/test/unit/modules/gateways/uala-bis.provider.spec.ts`:

```ts
import { UalaBisProvider } from '../../../../src/modules/gateways/providers/uala-bis.provider';
import { PaymentMethodsService } from '../../../../src/modules/payments/payment-methods.service';
import { ConfigService } from '@nestjs/config';
import type { Ctx } from '../../../../src/common/types/context';
import type { PaymentMethodOption } from '../../../../src/modules/payments/payments.domain';

const mockCtx: Ctx = { source: 'HTTP', requestId: 'test-request-id' };

const mockPaymentMethod: PaymentMethodOption = {
  id: 'pm_uala',
  name: 'Ualá Bis',
  publicName: 'Ualá',
  type: 'payment_gateway',
  status: 'enabled',
  visible: true,
  buyerCommissionPercent: 0,
  gatewayProvider: 'uala_bis',
  gatewayConfigEnvPrefix: 'UALA_TEST',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('UalaBisProvider', () => {
  let provider: UalaBisProvider;
  let paymentMethodsService: jest.Mocked<PaymentMethodsService>;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    paymentMethodsService = {
      getGatewayCredentials: jest.fn().mockReturnValue({
        username: 'testuser',
        clientId: 'testclientid',
        clientSecretId: 'testsecret',
      }),
    } as any;

    fetchMock = jest.fn();
    global.fetch = fetchMock;

    provider = new UalaBisProvider(paymentMethodsService, { get: jest.fn().mockReturnValue('https://frontend.test') } as any);
    (provider as any).paymentMethod = mockPaymentMethod;
  });

  describe('token cache', () => {
    it('fetches a new token when cache is empty', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'tok1', expires_in: 86400, token_type: 'Bearer' }),
      });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ uuid: 'order-uuid', status: 'PENDING', links: { checkout_link: 'https://uala.checkout/abc' } }),
      });

      await provider.createOrder(mockCtx, 'txn_1', { amount: 5000, currency: 'ARS' }, 'Entrada VIP', mockPaymentMethod);
      expect(fetchMock).toHaveBeenCalledTimes(2); // auth + create order
    });

    it('reuses token when still valid', async () => {
      // Pre-seed the cache
      (provider as any).tokenCache.set('pm_uala', {
        token: 'cached-token',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min from now
      });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ uuid: 'order-uuid-2', status: 'PENDING', links: { checkout_link: 'https://uala.checkout/xyz' } }),
      });

      await provider.createOrder(mockCtx, 'txn_2', { amount: 3000, currency: 'ARS' }, 'Platea', mockPaymentMethod);
      expect(fetchMock).toHaveBeenCalledTimes(1); // only create order, no auth call
    });

    it('refreshes token when within 5 minutes of expiry', async () => {
      (provider as any).tokenCache.set('pm_uala', {
        token: 'expiring-token',
        expiresAt: new Date(Date.now() + 3 * 60 * 1000), // 3 min from now
      });
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'new-token', expires_in: 86400, token_type: 'Bearer' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ uuid: 'order-uuid-3', status: 'PENDING', links: { checkout_link: 'https://uala.checkout/new' } }),
        });

      await provider.createOrder(mockCtx, 'txn_3', { amount: 2000, currency: 'ARS' }, 'General', mockPaymentMethod);
      expect(fetchMock).toHaveBeenCalledTimes(2); // refresh auth + create order
    });
  });

  describe('createOrder', () => {
    it('returns providerOrderId and checkoutUrl', async () => {
      fetchMock
        .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'tok', expires_in: 86400, token_type: 'Bearer' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ uuid: 'uala-123', status: 'PENDING', links: { checkout_link: 'https://checkout.uala/uala-123' } }) });

      const result = await provider.createOrder(mockCtx, 'txn_4', { amount: 10000, currency: 'ARS' }, 'Evento Fest', mockPaymentMethod);
      expect(result.providerOrderId).toBe('uala-123');
      expect(result.checkoutUrl).toBe('https://checkout.uala/uala-123');
    });

    it('sends amount as 2-decimal string', async () => {
      fetchMock
        .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'tok', expires_in: 86400, token_type: 'Bearer' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ uuid: 'uala-555', status: 'PENDING', links: { checkout_link: 'https://c.uala/555' } }) });

      await provider.createOrder(mockCtx, 'txn_5', { amount: 1505, currency: 'ARS' }, 'Test', mockPaymentMethod);

      const createOrderCall = fetchMock.mock.calls[1];
      const body = JSON.parse(createOrderCall[1].body);
      expect(body.amount).toBe('15.05');
    });
  });

  describe('getOrder', () => {
    it('maps APPROVED to approved', async () => {
      fetchMock
        .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'tok', expires_in: 86400, token_type: 'Bearer' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ uuid: 'uala-abc', status: 'APPROVED' }) });

      const status = await provider.getOrder(mockCtx, 'uala-abc', mockPaymentMethod);
      expect(status).toBe('approved');
    });

    it('maps PROCESSED to approved', async () => {
      fetchMock
        .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'tok', expires_in: 86400, token_type: 'Bearer' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ uuid: 'uala-abc', status: 'PROCESSED' }) });

      const status = await provider.getOrder(mockCtx, 'uala-abc', mockPaymentMethod);
      expect(status).toBe('approved');
    });

    it('maps REJECTED to rejected', async () => {
      fetchMock
        .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'tok', expires_in: 86400, token_type: 'Bearer' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ uuid: 'uala-abc', status: 'REJECTED' }) });

      const status = await provider.getOrder(mockCtx, 'uala-abc', mockPaymentMethod);
      expect(status).toBe('rejected');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && npx jest test/unit/modules/gateways/uala-bis.provider.spec.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `UalaBisProvider`**

Create `backend/src/modules/gateways/providers/uala-bis.provider.ts`:

```ts
import { Injectable } from '@nestjs/common';
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

const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000; // 5 minutes

interface TokenCacheEntry {
  token: string;
  expiresAt: Date;
}

@Injectable()
export class UalaBisProvider {
  private readonly logger = new ContextLogger(UalaBisProvider.name);
  private readonly tokenCache = new Map<string, TokenCacheEntry>();

  constructor(
    private readonly paymentMethodsService: PaymentMethodsService,
    private readonly configService: ConfigService,
  ) {}

  private getBaseUrls(): { auth: string; checkout: string } {
    const isStaging = this.configService.get<string>('app.environment') !== 'production';
    return isStaging
      ? {
          auth: 'https://auth.stage.developers.ar.ua.la/v2/api/auth/token',
          checkout: 'https://checkout.stage.developers.ar.ua.la/v2/api',
        }
      : {
          auth: 'https://auth.developers.ar.ua.la/v2/api/auth/token',
          checkout: 'https://checkout.developers.ar.ua.la/v2/api',
        };
  }

  private getFrontendBaseUrl(): string {
    return this.configService.get<string>('app.frontendBaseUrl') ?? '';
  }

  private isTokenValid(entry: TokenCacheEntry): boolean {
    return entry.expiresAt.getTime() - Date.now() > TOKEN_REFRESH_MARGIN_MS;
  }

  private async fetchToken(
    ctx: Ctx,
    paymentMethod: PaymentMethodOption,
  ): Promise<string> {
    const creds = this.paymentMethodsService.getGatewayCredentials(ctx, paymentMethod);
    const { auth } = this.getBaseUrls();

    const response = await fetch(auth, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: creds.username,
        client_id: creds.clientId,
        client_secret_id: creds.clientSecretId,
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      this.logger.error(ctx, `Ualá auth failed: ${response.status}`, body);
      throw new Error(`Ualá authentication failed: ${response.status}`);
    }

    const data = await response.json();
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);
    this.tokenCache.set(paymentMethod.id, { token: data.access_token, expiresAt });
    this.logger.log(ctx, `Ualá token refreshed for ${paymentMethod.id}`);
    return data.access_token;
  }

  private async getToken(ctx: Ctx, paymentMethod: PaymentMethodOption): Promise<string> {
    const cached = this.tokenCache.get(paymentMethod.id);
    if (cached && this.isTokenValid(cached)) {
      return cached.token;
    }
    return this.fetchToken(ctx, paymentMethod);
  }

  private centsToDecimalString(cents: number): string {
    return (cents / 100).toFixed(2);
  }

  private mapStatus(ualaStatus: string): GatewayProviderOrderStatus {
    switch (ualaStatus) {
      case 'APPROVED':
      case 'PROCESSED':
        return 'approved';
      case 'REJECTED':
        return 'rejected';
      case 'REFUNDED':
        return 'refunded';
      default:
        return 'pending';
    }
  }

  async createOrder(
    ctx: Ctx,
    transactionId: string,
    amount: GatewayProviderMoney,
    description: string,
    paymentMethod: PaymentMethodOption,
  ): Promise<GatewayProviderOrder> {
    const token = await this.getToken(ctx, paymentMethod);
    const { checkout } = this.getBaseUrls();
    const frontendBaseUrl = this.getFrontendBaseUrl();

    const body = {
      amount: this.centsToDecimalString(amount.amount),
      description,
      callback_success: `${frontendBaseUrl}/transactions/${transactionId}`,
      callback_fail: `${frontendBaseUrl}/transactions/${transactionId}`,
      notification_url: `${this.configService.get('app.baseUrl')}/api/payments/webhook/uala-bis`,
      external_reference: transactionId,
    };

    const response = await fetch(`${checkout}/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      this.logger.error(ctx, `Ualá create order failed: ${response.status}`, err);
      throw new Error(`Ualá order creation failed: ${response.status}`);
    }

    const data = await response.json();
    this.logger.log(ctx, `Ualá order created: ${data.uuid} for transaction ${transactionId}`);
    return { providerOrderId: data.uuid, checkoutUrl: data.links.checkout_link };
  }

  async getOrder(
    ctx: Ctx,
    providerOrderId: string,
    paymentMethod: PaymentMethodOption,
  ): Promise<GatewayProviderOrderStatus> {
    const token = await this.getToken(ctx, paymentMethod);
    const { checkout } = this.getBaseUrls();

    const response = await fetch(`${checkout}/orders/${providerOrderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      this.logger.error(ctx, `Ualá get order failed: ${response.status} for ${providerOrderId}`);
      throw new Error(`Ualá get order failed: ${response.status}`);
    }

    const data = await response.json();
    return this.mapStatus(data.status);
  }

  async refundOrder(
    ctx: Ctx,
    providerOrderId: string,
    amount: GatewayProviderMoney,
    paymentMethod: PaymentMethodOption,
  ): Promise<void> {
    const token = await this.getToken(ctx, paymentMethod);
    const { checkout } = this.getBaseUrls();

    const response = await fetch(`${checkout}/orders/${providerOrderId}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        amount: this.centsToDecimalString(amount.amount),
        notification_url: `${this.configService.get('app.baseUrl')}/api/payments/webhook/uala-bis`,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      this.logger.error(ctx, `Ualá refund failed: ${response.status} for ${providerOrderId}`, err);
      throw new Error(`Ualá refund failed: ${response.status} — ${JSON.stringify(err)}`);
    }

    this.logger.log(ctx, `Ualá refund initiated for order ${providerOrderId}`);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && npx jest test/unit/modules/gateways/uala-bis.provider.spec.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/gateways/providers/uala-bis.provider.ts backend/test/unit/modules/gateways/uala-bis.provider.spec.ts
git commit -m "feat: implement UalaBisProvider with token cache and order/refund operations"
```

---

## Task 6: Implement `MercadoPagoProvider` skeleton

**Files:**
- Create: `backend/src/modules/gateways/providers/mercadopago.provider.ts`

- [ ] **Step 1: Create skeleton**

```ts
// backend/src/modules/gateways/providers/mercadopago.provider.ts
import { Injectable, NotImplementedException } from '@nestjs/common';
import type { Ctx } from '../../../common/types/context';
import type { PaymentMethodOption } from '../../payments/payments.domain';
import type {
  GatewayProviderOrder,
  GatewayProviderOrderStatus,
  GatewayProviderMoney,
} from './gateway-provider.interface';

@Injectable()
export class MercadoPagoProvider {
  async createOrder(
    _ctx: Ctx,
    _transactionId: string,
    _amount: GatewayProviderMoney,
    _description: string,
    _paymentMethod: PaymentMethodOption,
  ): Promise<GatewayProviderOrder> {
    throw new NotImplementedException('MercadoPago integration not yet implemented');
  }

  async getOrder(
    _ctx: Ctx,
    _providerOrderId: string,
    _paymentMethod: PaymentMethodOption,
  ): Promise<GatewayProviderOrderStatus> {
    throw new NotImplementedException('MercadoPago integration not yet implemented');
  }

  async refundOrder(
    _ctx: Ctx,
    _providerOrderId: string,
    _amount: GatewayProviderMoney,
    _paymentMethod: PaymentMethodOption,
  ): Promise<void> {
    throw new NotImplementedException('MercadoPago integration not yet implemented');
  }
}
```

- [ ] **Step 2: Compile check**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/gateways/providers/mercadopago.provider.ts
git commit -m "feat: add MercadoPago provider skeleton (not implemented)"
```

---

## Task 7: Implement `GatewayPaymentsService` dispatcher

**Files:**
- Create: `backend/src/modules/gateways/gateway-payments.service.ts`
- Test: `backend/test/unit/modules/gateways/gateway-payments.service.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `backend/test/unit/modules/gateways/gateway-payments.service.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GatewayPaymentsService } from '../../../../src/modules/gateways/gateway-payments.service';
import { UalaBisProvider } from '../../../../src/modules/gateways/providers/uala-bis.provider';
import { MercadoPagoProvider } from '../../../../src/modules/gateways/providers/mercadopago.provider';
import { PaymentMethodsService } from '../../../../src/modules/payments/payment-methods.service';
import { GATEWAY_ORDERS_REPOSITORY } from '../../../../src/modules/gateways/gateway-orders.repository.interface';
import { TransactionManager } from '../../../../src/common/database/transaction-manager';
import type { Ctx } from '../../../../src/common/types/context';
import type { PaymentMethodOption } from '../../../../src/modules/payments/payments.domain';

const ctx: Ctx = { source: 'HTTP', requestId: 'req-1' };

const ualaPm: PaymentMethodOption = {
  id: 'pm_uala',
  name: 'Ualá',
  publicName: 'Ualá',
  type: 'payment_gateway',
  status: 'enabled',
  visible: true,
  buyerCommissionPercent: 0,
  gatewayProvider: 'uala_bis',
  gatewayConfigEnvPrefix: 'UALA_PROD',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('GatewayPaymentsService', () => {
  let service: GatewayPaymentsService;
  let ualaProvider: jest.Mocked<UalaBisProvider>;
  let ordersRepo: any;
  let txManager: any;

  beforeEach(async () => {
    ualaProvider = { createOrder: jest.fn(), getOrder: jest.fn(), refundOrder: jest.fn() } as any;
    ordersRepo = { create: jest.fn(), findByTransactionId: jest.fn(), findByProviderOrderId: jest.fn(), findByProviderOrderIdForUpdate: jest.fn(), findPendingWithPendingPaymentTransaction: jest.fn(), updateStatus: jest.fn() };
    txManager = { executeInTransaction: jest.fn().mockImplementation((_ctx: any, fn: any) => fn(_ctx)), getClient: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        GatewayPaymentsService,
        { provide: UalaBisProvider, useValue: ualaProvider },
        { provide: MercadoPagoProvider, useValue: { createOrder: jest.fn(), getOrder: jest.fn(), refundOrder: jest.fn() } },
        { provide: GATEWAY_ORDERS_REPOSITORY, useValue: ordersRepo },
        { provide: TransactionManager, useValue: txManager },
        { provide: PaymentMethodsService, useValue: { findById: jest.fn() } },
      ],
    }).compile();

    service = module.get(GatewayPaymentsService);
  });

  it('routes createOrder to UalaBisProvider for uala_bis', async () => {
    ualaProvider.createOrder.mockResolvedValue({ providerOrderId: 'uuid-1', checkoutUrl: 'https://checkout.uala/1' });
    ordersRepo.create.mockResolvedValue(undefined);

    const result = await service.createOrder(ctx, 'txn_1', { amount: 5000, currency: 'ARS' }, 'Test', ualaPm);

    expect(ualaProvider.createOrder).toHaveBeenCalledWith(ctx, 'txn_1', { amount: 5000, currency: 'ARS' }, 'Test', ualaPm);
    expect(result.checkoutUrl).toBe('https://checkout.uala/1');
  });

  it('throws if provider is unknown', async () => {
    const unknownPm = { ...ualaPm, gatewayProvider: 'payway' as any };
    await expect(service.createOrder(ctx, 'txn_2', { amount: 5000, currency: 'ARS' }, 'Test', unknownPm))
      .rejects.toThrow();
  });

  it('handleTransactionCancelled updates GatewayOrder status to cancelled', async () => {
    ordersRepo.findByTransactionId.mockResolvedValue({ id: 'go_1', status: 'pending' });

    await service.handleTransactionCancelled(ctx, 'txn_cancel');

    expect(ordersRepo.updateStatus).toHaveBeenCalledWith(ctx, 'go_1', 'cancelled');
  });

  it('handleTransactionCancelled is a no-op if no GatewayOrder exists', async () => {
    ordersRepo.findByTransactionId.mockResolvedValue(null);
    await expect(service.handleTransactionCancelled(ctx, 'txn_no_order')).resolves.toBeUndefined();
    expect(ordersRepo.updateStatus).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && npx jest test/unit/modules/gateways/gateway-payments.service.spec.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `GatewayPaymentsService`**

Create `backend/src/modules/gateways/gateway-payments.service.ts`:

```ts
import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { UalaBisProvider } from './providers/uala-bis.provider';
import { MercadoPagoProvider } from './providers/mercadopago.provider';
import { TransactionManager } from '../../common/database/transaction-manager';
import {
  GATEWAY_ORDERS_REPOSITORY,
  type IGatewayOrdersRepository,
} from './gateway-orders.repository.interface';
import { ContextLogger } from '../../common/logger/context-logger';
import type { Ctx } from '../../common/types/context';
import type { TxCtx } from '../../common/database/types';
import type { PaymentMethodOption } from '../payments/payments.domain';
import type { GatewayOrderRecord, GatewayOrderStatus } from './gateways.domain';

export interface GatewayOrderResult {
  providerOrderId: string;
  checkoutUrl: string;
}

@Injectable()
export class GatewayPaymentsService {
  private readonly logger = new ContextLogger(GatewayPaymentsService.name);

  constructor(
    private readonly ualaBisProvider: UalaBisProvider,
    private readonly mercadoPagoProvider: MercadoPagoProvider,
    @Inject(GATEWAY_ORDERS_REPOSITORY)
    private readonly ordersRepository: IGatewayOrdersRepository,
    private readonly txManager: TransactionManager,
  ) {}

  private generateId(): string {
    return `go_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }

  private getProvider(paymentMethod: PaymentMethodOption) {
    switch (paymentMethod.gatewayProvider) {
      case 'uala_bis':
        return this.ualaBisProvider;
      case 'mercadopago':
        return this.mercadoPagoProvider;
      default:
        throw new BadRequestException(
          `No provider implementation for gateway: ${paymentMethod.gatewayProvider}`,
        );
    }
  }

  async createOrder(
    ctx: Ctx,
    transactionId: string,
    amount: { amount: number; currency: string },
    description: string,
    paymentMethod: PaymentMethodOption,
  ): Promise<GatewayOrderResult> {
    const provider = this.getProvider(paymentMethod);
    const result = await provider.createOrder(ctx, transactionId, amount, description, paymentMethod);

    const order: GatewayOrderRecord = {
      id: this.generateId(),
      transactionId,
      paymentMethodId: paymentMethod.id,
      provider: paymentMethod.gatewayProvider!,
      providerOrderId: result.providerOrderId,
      checkoutUrl: result.checkoutUrl,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Persist GatewayOrder within a transaction so provider success + DB write are atomic.
    // If the caller (TransactionsService) is already inside executeInTransaction, this reuses that tx.
    await this.txManager.executeInTransaction(ctx, async (txCtx) => {
      await this.ordersRepository.create(txCtx, order);
    });
    this.logger.log(ctx, `Gateway order ${order.id} created for transaction ${transactionId}`);
    return result;
  }

  async syncOrderStatus(
    ctx: Ctx,
    gatewayOrder: GatewayOrderRecord,
    paymentMethod: PaymentMethodOption,
  ): Promise<GatewayOrderStatus | null> {
    const provider = this.getProvider(paymentMethod);
    const status = await provider.getOrder(ctx, gatewayOrder.providerOrderId, paymentMethod);

    if (status === gatewayOrder.status) return null;
    return status;
  }

  async handleTransactionCancelled(ctx: TxCtx, transactionId: string): Promise<void> {
    const order = await this.ordersRepository.findByTransactionId(ctx, transactionId);
    if (!order) return;
    await this.ordersRepository.updateStatus(ctx, order.id, 'cancelled');
    this.logger.log(ctx, `GatewayOrder ${order.id} marked cancelled for transaction ${transactionId}`);
  }

  async getOrderByProviderIdForUpdate(ctx: Ctx, providerOrderId: string): Promise<GatewayOrderRecord | null> {
    return this.ordersRepository.findByProviderOrderIdForUpdate(ctx, providerOrderId);
  }

  async updateOrderStatus(ctx: Ctx, id: string, status: GatewayOrderStatus): Promise<void> {
    await this.ordersRepository.updateStatus(ctx, id, status);
  }

  async getPendingOrders(ctx: Ctx): Promise<GatewayOrderRecord[]> {
    return this.ordersRepository.findPendingWithPendingPaymentTransaction(ctx);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && npx jest test/unit/modules/gateways/gateway-payments.service.spec.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/gateways/gateway-payments.service.ts backend/test/unit/modules/gateways/gateway-payments.service.spec.ts
git commit -m "feat: implement GatewayPaymentsService dispatcher"
```

---

## Task 8: Wire `TransactionsService` to use `GatewayPaymentsService`

**Files:**
- Modify: `backend/src/modules/transactions/transactions.service.ts`
- Modify: `backend/src/modules/transactions/transactions.module.ts`

- [ ] **Step 1: Add `GatewayPaymentsService` injection to `TransactionsService`**

In `transactions.service.ts`, add import and inject `GatewayPaymentsService`. Then:

1. In the method that initiates payment (where `PaymentsService.createPaymentIntent` is called for `payment_gateway` methods), route to `GatewayPaymentsService.createOrder()` instead and return `checkoutUrl` as `clientSecret` in the response.

2. In `cancelTransaction()`, after the `transactionsRepository.updateWithVersion()` call, add:

```ts
await this.gatewayPaymentsService.handleTransactionCancelled(txCtx, transactionId);
```

This call is inside the `executeInTransaction` callback so it participates in the same DB transaction.

- [ ] **Step 2: Add `handleGatewayPaymentApproved` and `handleGatewayPaymentRejected` methods to `TransactionsService`**

```ts
async handleGatewayPaymentApproved(ctx: Ctx, transactionId: string): Promise<void> {
  // Delegates to existing handlePaymentReceived — same logic
  await this.handlePaymentReceived(ctx, transactionId);
}

async handleGatewayPaymentRejected(ctx: Ctx, transactionId: string): Promise<void> {
  await this.cancelTransaction(ctx, transactionId, RequiredActor.Platform, CancellationReason.PaymentFailed);
}
```

- [ ] **Step 3: Import `GatewaysModule` in `TransactionsModule`**

In `transactions.module.ts`, add `forwardRef(() => GatewaysModule)` to imports (forward ref needed to avoid circular dependency since `GatewaysModule` may import `PaymentsModule` which `TransactionsModule` already imports).

- [ ] **Step 4: Compile check**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/transactions/transactions.service.ts backend/src/modules/transactions/transactions.module.ts
git commit -m "feat: wire TransactionsService to GatewayPaymentsService for payment_gateway methods"
```

---

## Task 9: Add webhook endpoints

**Files:**
- Modify: `backend/src/modules/payments/payments.controller.ts`
- Test: `backend/test/unit/modules/gateways/webhook.controller.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `backend/test/unit/modules/gateways/webhook.controller.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { PaymentsController } from '../../../../src/modules/payments/payments.controller';
import { PaymentsService } from '../../../../src/modules/payments/payments.service';
import { GatewayPaymentsService } from '../../../../src/modules/gateways/gateway-payments.service';
import { UalaBisProvider } from '../../../../src/modules/gateways/providers/uala-bis.provider';
import { TransactionsService } from '../../../../src/modules/transactions/transactions.service';
import { PaymentMethodsService } from '../../../../src/modules/payments/payment-methods.service';
import type { Ctx } from '../../../../src/common/types/context';

const ctx: Ctx = { source: 'HTTP', requestId: 'req-webhook' };

describe('Webhook endpoints', () => {
  let controller: PaymentsController;
  let ualaProvider: jest.Mocked<UalaBisProvider>;
  let gatewayService: jest.Mocked<GatewayPaymentsService>;
  let transactionsService: jest.Mocked<TransactionsService>;
  let paymentMethodsService: jest.Mocked<PaymentMethodsService>;

  beforeEach(async () => {
    ualaProvider = { getOrder: jest.fn() } as any;
    gatewayService = { getOrderByProviderIdForUpdate: jest.fn(), updateOrderStatus: jest.fn() } as any;
    transactionsService = { handleGatewayPaymentApproved: jest.fn(), handleGatewayPaymentRejected: jest.fn() } as any;
    paymentMethodsService = { findById: jest.fn() } as any;

    const module = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        { provide: PaymentsService, useValue: { processWebhook: jest.fn(), getPaymentIntent: jest.fn(), confirmPayment: jest.fn() } },
        { provide: UalaBisProvider, useValue: ualaProvider },
        { provide: GatewayPaymentsService, useValue: gatewayService },
        { provide: TransactionsService, useValue: transactionsService },
        { provide: PaymentMethodsService, useValue: paymentMethodsService },
      ],
    }).compile();

    controller = module.get(PaymentsController);
  });

  describe('POST /api/payments/webhook/uala-bis', () => {
    it('calls getOrder to verify status before processing', async () => {
      const gatewayOrder = { id: 'go_1', transactionId: 'txn_1', status: 'pending', paymentMethodId: 'pm_uala' };
      gatewayService.getOrderByProviderIdForUpdate.mockResolvedValue(gatewayOrder as any);
      ualaProvider.getOrder.mockResolvedValue('approved');
      paymentMethodsService.findById.mockResolvedValue({ id: 'pm_uala' } as any);

      await controller.handleUalaBisWebhook(ctx, { uuid: 'uala-uuid-1', external_reference: 'txn_1', status: 'APPROVED', created_date: '', api_version: '2' });

      expect(ualaProvider.getOrder).toHaveBeenCalledWith(ctx, 'uala-uuid-1', expect.anything());
      expect(transactionsService.handleGatewayPaymentApproved).toHaveBeenCalledWith(ctx, 'txn_1');
    });

    it('returns 200 even if processing fails', async () => {
      gatewayService.getOrderByProviderIdForUpdate.mockRejectedValue(new Error('DB error'));

      const result = await controller.handleUalaBisWebhook(ctx, { uuid: 'uala-uuid-2', external_reference: 'txn_2', status: 'APPROVED', created_date: '', api_version: '2' });

      expect(result).toEqual({ received: true });
    });

    it('returns early if GatewayOrder is already in terminal status', async () => {
      const terminalOrder = { id: 'go_2', transactionId: 'txn_2', status: 'approved', paymentMethodId: 'pm_uala' };
      gatewayService.getOrderByProviderIdForUpdate.mockResolvedValue(terminalOrder as any);

      await controller.handleUalaBisWebhook(ctx, { uuid: 'uala-uuid-3', external_reference: 'txn_2', status: 'APPROVED', created_date: '', api_version: '2' });

      expect(ualaProvider.getOrder).not.toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && npx jest test/unit/modules/gateways/webhook.controller.spec.ts
```

Expected: FAIL — method not found.

- [ ] **Step 3: Add webhook handlers to `PaymentsController`**

Add the following to `payments.controller.ts`:

```ts
@Post('webhook/uala-bis')
async handleUalaBisWebhook(
  @Context() ctx: Ctx,
  @Body() body: { uuid: string; external_reference: string; status: string; created_date: string; api_version: string },
): Promise<{ received: true }> {
  try {
    const terminalStatuses = ['approved', 'rejected', 'cancelled', 'refunded'];

    const gatewayOrder = await this.gatewayPaymentsService.getOrderByProviderIdForUpdate(ctx, body.uuid);
    if (!gatewayOrder) return { received: true };
    if (terminalStatuses.includes(gatewayOrder.status)) return { received: true };

    const paymentMethod = await this.paymentMethodsService.findById(ctx, gatewayOrder.paymentMethodId);
    const verifiedStatus = await this.ualaBisProvider.getOrder(ctx, body.uuid, paymentMethod);

    // updateOrderStatus + handleGatewayPayment* must be atomic.
    // Both are wrapped in executeInTransaction inside their respective service methods,
    // which reuse the same tx if called from within an outer transaction.
    // Use txManager.executeInTransaction here so the GatewayOrder update and the
    // Transaction status change commit together or not at all.
    if (verifiedStatus === 'approved') {
      await this.txManager.executeInTransaction(ctx, async (txCtx) => {
        await this.gatewayPaymentsService.updateOrderStatus(txCtx, gatewayOrder.id, 'approved');
        await this.transactionsService.handleGatewayPaymentApproved(txCtx, gatewayOrder.transactionId);
      });
    } else if (verifiedStatus === 'rejected') {
      await this.txManager.executeInTransaction(ctx, async (txCtx) => {
        await this.gatewayPaymentsService.updateOrderStatus(txCtx, gatewayOrder.id, 'rejected');
        await this.transactionsService.handleGatewayPaymentRejected(txCtx, gatewayOrder.transactionId);
      });
    }
  } catch (error) {
    this.logger.error(ctx, `Ualá webhook processing error: ${error}`);
  }
  return { received: true };
}

@Post('webhook/mercadopago')
async handleMercadoPagoWebhook(@Context() ctx: Ctx): Promise<{ received: true }> {
  this.logger.log(ctx, 'MercadoPago webhook received (not implemented)');
  return { received: true };
}
```

Also inject `GatewayPaymentsService`, `UalaBisProvider`, `TransactionsService`, `PaymentMethodsService`, and `TransactionManager` into `PaymentsController`. Add `TransactionManager` to the test's providers array as a mock: `{ provide: TransactionManager, useValue: { executeInTransaction: jest.fn().mockImplementation((_ctx: any, fn: any) => fn(_ctx)) } }`.

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && npx jest test/unit/modules/gateways/webhook.controller.spec.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/payments/payments.controller.ts backend/test/unit/modules/gateways/webhook.controller.spec.ts
git commit -m "feat: add Ualá Bis and MercadoPago webhook endpoints"
```

---

## Task 10: Implement `GatewayPaymentsScheduler` (polling)

**Files:**
- Create: `backend/src/modules/gateways/gateway-payments.scheduler.ts`
- Test: `backend/test/unit/modules/gateways/gateway-payments.scheduler.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `backend/test/unit/modules/gateways/gateway-payments.scheduler.spec.ts`:

```ts
import { GatewayPaymentsScheduler } from '../../../../src/modules/gateways/gateway-payments.scheduler';
import { GatewayPaymentsService } from '../../../../src/modules/gateways/gateway-payments.service';
import { TransactionsService } from '../../../../src/modules/transactions/transactions.service';
import { PaymentMethodsService } from '../../../../src/modules/payments/payment-methods.service';
import { DistributedLockService } from '../../../../src/common/locks/distributed-lock.service';
import { CronMetricsService } from '../../../../src/common/metrics/cron-metrics.service';

describe('GatewayPaymentsScheduler', () => {
  let scheduler: GatewayPaymentsScheduler;
  let gatewayService: jest.Mocked<GatewayPaymentsService>;
  let transactionsService: jest.Mocked<TransactionsService>;
  let lockService: jest.Mocked<DistributedLockService>;
  let paymentMethodsService: jest.Mocked<PaymentMethodsService>;

  beforeEach(() => {
    gatewayService = {
      getPendingOrders: jest.fn().mockResolvedValue([]),
      syncOrderStatus: jest.fn(),
      updateOrderStatus: jest.fn(),
    } as any;
    transactionsService = {
      handleGatewayPaymentApproved: jest.fn(),
      handleGatewayPaymentRejected: jest.fn(),
    } as any;
    lockService = {
      withLockAndLog: jest.fn().mockImplementation((_ctx: any, _id: any, _ttl: any, fn: any) => fn()),
    } as any;
    paymentMethodsService = { findById: jest.fn() } as any;

    const txManager = { executeInTransaction: jest.fn().mockImplementation((_ctx: any, fn: any) => fn(_ctx)) };

    scheduler = new GatewayPaymentsScheduler(
      gatewayService,
      transactionsService,
      paymentMethodsService,
      lockService,
      { run: jest.fn().mockImplementation((_name: any, fn: any) => fn()) } as any,
      txManager as any,
    );
  });

  it('acquires distributed lock before processing', async () => {
    await scheduler.pollPendingOrders();
    expect(lockService.withLockAndLog).toHaveBeenCalledWith(
      expect.anything(),
      'scheduler:gateway:poll-orders',
      expect.any(Number),
      expect.any(Function),
    );
  });

  it('processes each pending order', async () => {
    const order = { id: 'go_1', transactionId: 'txn_1', paymentMethodId: 'pm_1', providerOrderId: 'uala-uuid', status: 'pending' };
    gatewayService.getPendingOrders.mockResolvedValue([order as any]);
    gatewayService.syncOrderStatus.mockResolvedValue('approved');
    paymentMethodsService.findById.mockResolvedValue({ id: 'pm_1' } as any);

    await scheduler.pollPendingOrders();

    expect(gatewayService.syncOrderStatus).toHaveBeenCalledWith(expect.anything(), order, expect.anything());
    expect(transactionsService.handleGatewayPaymentApproved).toHaveBeenCalledWith(expect.anything(), 'txn_1');
  });

  it('does not block other orders if one fails', async () => {
    const orders = [
      { id: 'go_1', transactionId: 'txn_1', paymentMethodId: 'pm_1', providerOrderId: 'uala-1', status: 'pending' },
      { id: 'go_2', transactionId: 'txn_2', paymentMethodId: 'pm_1', providerOrderId: 'uala-2', status: 'pending' },
    ];
    gatewayService.getPendingOrders.mockResolvedValue(orders as any);
    paymentMethodsService.findById.mockResolvedValue({ id: 'pm_1' } as any);
    gatewayService.syncOrderStatus
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce('rejected');

    await scheduler.pollPendingOrders();

    expect(transactionsService.handleGatewayPaymentRejected).toHaveBeenCalledWith(expect.anything(), 'txn_2');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && npx jest test/unit/modules/gateways/gateway-payments.scheduler.spec.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `GatewayPaymentsScheduler`**

Create `backend/src/modules/gateways/gateway-payments.scheduler.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { randomBytes } from 'crypto';
import { GatewayPaymentsService } from './gateway-payments.service';
import { TransactionsService } from '../transactions/transactions.service';
import { PaymentMethodsService } from '../payments/payment-methods.service';
import { DistributedLockService } from '../../common/locks/distributed-lock.service';
import { CronMetricsService } from '../../common/metrics/cron-metrics.service';
import { TransactionManager } from '../../common/database/transaction-manager';
import { ContextLogger } from '../../common/logger/context-logger';
import type { Ctx } from '../../common/types/context';

const LOCK_ID = 'scheduler:gateway:poll-orders';
const LOCK_TTL_SECONDS = 180; // 3 minutes (> 2-minute interval)

@Injectable()
export class GatewayPaymentsScheduler {
  private readonly logger = new ContextLogger(GatewayPaymentsScheduler.name);

  constructor(
    private readonly gatewayPaymentsService: GatewayPaymentsService,
    private readonly transactionsService: TransactionsService,
    private readonly paymentMethodsService: PaymentMethodsService,
    private readonly lockService: DistributedLockService,
    private readonly cronMetrics: CronMetricsService,
    private readonly txManager: TransactionManager,
  ) {}

  private makeCtx(): Ctx {
    return { source: 'CRON', requestId: `cron_${Date.now()}_${randomBytes(4).toString('hex')}`, scheduledJobName: 'pollPendingOrders' };
  }

  @Cron('*/2 * * * *') // every 2 minutes
  async pollPendingOrders(): Promise<void> {
    await this.cronMetrics.run('pollPendingGatewayOrders', async () => {
      const ctx = this.makeCtx();
      await this.lockService.withLockAndLog(ctx, LOCK_ID, LOCK_TTL_SECONDS, async () => {
        const orders = await this.gatewayPaymentsService.getPendingOrders(ctx);
        for (const order of orders) {
          try {
            const paymentMethod = await this.paymentMethodsService.findById(ctx, order.paymentMethodId);
            const newStatus = await this.gatewayPaymentsService.syncOrderStatus(ctx, order, paymentMethod);
            if (!newStatus || newStatus === order.status) continue;

            // GatewayOrder update + Transaction status change must be atomic
            if (newStatus === 'approved') {
              await this.txManager.executeInTransaction(ctx, async (txCtx) => {
                await this.gatewayPaymentsService.updateOrderStatus(txCtx, order.id, 'approved');
                await this.transactionsService.handleGatewayPaymentApproved(txCtx, order.transactionId);
              });
            } else if (newStatus === 'rejected') {
              await this.txManager.executeInTransaction(ctx, async (txCtx) => {
                await this.gatewayPaymentsService.updateOrderStatus(txCtx, order.id, 'rejected');
                await this.transactionsService.handleGatewayPaymentRejected(txCtx, order.transactionId);
              });
            }
          } catch (error) {
            this.logger.error(ctx, `Error polling order ${order.id}: ${error}`);
          }
        }
        return orders.length;
      });
    });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && npx jest test/unit/modules/gateways/gateway-payments.scheduler.spec.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/gateways/gateway-payments.scheduler.ts backend/test/unit/modules/gateways/gateway-payments.scheduler.spec.ts
git commit -m "feat: implement GatewayPaymentsScheduler for polling pending orders every 2 minutes"
```

---

## Task 11: Implement `GatewayRefundsScheduler`

**Files:**
- Create: `backend/src/modules/gateways/gateway-refunds.scheduler.ts`
- Test: `backend/test/unit/modules/gateways/gateway-refunds.scheduler.spec.ts`

- [ ] **Step 1: Add `IGatewayRefundsRepository` and late-approval handling to `GatewayPaymentsService`**

First extend `GatewayPaymentsService` to handle late approvals. Add injection of `IGatewayRefundsRepository` and add:

```ts
async handleLateApproval(ctx: Ctx, gatewayOrder: GatewayOrderRecord, amount: { amount: number; currency: string }): Promise<void> {
  await this.txManager.executeInTransaction(ctx, async (txCtx) => {
    await this.ordersRepository.updateStatus(txCtx, gatewayOrder.id, 'approved');

    const refund: GatewayRefundRecord = {
      id: `gr_${Date.now()}_${randomBytes(4).toString('hex')}`,
      transactionId: gatewayOrder.transactionId,
      gatewayOrderId: gatewayOrder.id,
      providerOrderId: gatewayOrder.providerOrderId,
      paymentMethodId: gatewayOrder.paymentMethodId,
      provider: gatewayOrder.provider,
      amount: amount.amount,
      currency: amount.currency,
      status: 'Pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.refundsRepository.create(txCtx, refund);
    this.logger.warn(txCtx, `Late approval detected for cancelled transaction ${gatewayOrder.transactionId} — refund queued`);
  });
}

async getPendingRefunds(ctx: Ctx): Promise<GatewayRefundRecord[]> {
  return this.refundsRepository.findPending(ctx);
}

async updateRefundStatus(ctx: Ctx, id: string, status: 'Processing' | 'Processed' | 'Failed', apiCallLog?: GatewayApiCallLog): Promise<void> {
  await this.refundsRepository.updateStatus(ctx, id, status, apiCallLog);
}
```

Update polling scheduler and webhook handler: when a `GatewayOrder` is found with `status === 'cancelled'` but Ualá returns `'approved'`, call `handleLateApproval()` instead of `handleGatewayPaymentApproved()`.

- [ ] **Step 2: Write failing tests for the scheduler**

Create `backend/test/unit/modules/gateways/gateway-refunds.scheduler.spec.ts`:

```ts
import { GatewayRefundsScheduler } from '../../../../src/modules/gateways/gateway-refunds.scheduler';
import { GatewayPaymentsService } from '../../../../src/modules/gateways/gateway-payments.service';
import { UalaBisProvider } from '../../../../src/modules/gateways/providers/uala-bis.provider';
import { PaymentMethodsService } from '../../../../src/modules/payments/payment-methods.service';
import { DistributedLockService } from '../../../../src/common/locks/distributed-lock.service';

describe('GatewayRefundsScheduler', () => {
  let scheduler: GatewayRefundsScheduler;
  let gatewayService: jest.Mocked<GatewayPaymentsService>;
  let ualaProvider: jest.Mocked<UalaBisProvider>;
  let lockService: jest.Mocked<DistributedLockService>;
  let paymentMethodsService: jest.Mocked<PaymentMethodsService>;

  beforeEach(() => {
    gatewayService = {
      getPendingRefunds: jest.fn().mockResolvedValue([]),
      updateRefundStatus: jest.fn(),
    } as any;
    ualaProvider = { refundOrder: jest.fn() } as any;
    lockService = {
      withLockAndLog: jest.fn().mockImplementation((_ctx: any, _id: any, _ttl: any, fn: any) => fn()),
    } as any;
    paymentMethodsService = { findById: jest.fn() } as any;

    scheduler = new GatewayRefundsScheduler(
      gatewayService,
      ualaProvider,
      paymentMethodsService,
      lockService,
      { run: jest.fn().mockImplementation((_name: any, fn: any) => fn()) } as any,
    );
  });

  it('acquires distributed lock before processing', async () => {
    await scheduler.processPendingRefunds();
    expect(lockService.withLockAndLog).toHaveBeenCalledWith(
      expect.anything(),
      'scheduler:gateway:process-refunds',
      expect.any(Number),
      expect.any(Function),
    );
  });

  it('marks refund as Processing then Processed on success', async () => {
    const refund = { id: 'gr_1', providerOrderId: 'uala-uuid', provider: 'uala_bis', amount: 5000, currency: 'ARS', paymentMethodId: 'pm_uala' };
    gatewayService.getPendingRefunds.mockResolvedValue([refund as any]);
    paymentMethodsService.findById.mockResolvedValue({ id: 'pm_uala' } as any);
    ualaProvider.refundOrder.mockResolvedValue(undefined);

    await scheduler.processPendingRefunds();

    expect(gatewayService.updateRefundStatus).toHaveBeenCalledWith(expect.anything(), 'gr_1', 'Processing');
    expect(ualaProvider.refundOrder).toHaveBeenCalled();
    expect(gatewayService.updateRefundStatus).toHaveBeenCalledWith(expect.anything(), 'gr_1', 'Processed', expect.objectContaining({ httpStatus: 200 }));
  });

  it('marks refund as Failed and logs apiCallLog on provider error', async () => {
    const refund = { id: 'gr_2', providerOrderId: 'uala-uuid-2', provider: 'uala_bis', amount: 3000, currency: 'ARS', paymentMethodId: 'pm_uala' };
    gatewayService.getPendingRefunds.mockResolvedValue([refund as any]);
    paymentMethodsService.findById.mockResolvedValue({ id: 'pm_uala' } as any);
    ualaProvider.refundOrder.mockRejectedValue(new Error('Ualá refund failed: 400'));

    await scheduler.processPendingRefunds();

    expect(gatewayService.updateRefundStatus).toHaveBeenCalledWith(
      expect.anything(),
      'gr_2',
      'Failed',
      expect.objectContaining({ httpStatus: 0, endpoint: expect.stringContaining('refund') }),
    );
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd backend && npx jest test/unit/modules/gateways/gateway-refunds.scheduler.spec.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement `GatewayRefundsScheduler`**

Create `backend/src/modules/gateways/gateway-refunds.scheduler.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomBytes } from 'crypto';
import { GatewayPaymentsService } from './gateway-payments.service';
import { UalaBisProvider } from './providers/uala-bis.provider';
import { PaymentMethodsService } from '../payments/payment-methods.service';
import { DistributedLockService } from '../../common/locks/distributed-lock.service';
import { CronMetricsService } from '../../common/metrics/cron-metrics.service';
import { ContextLogger } from '../../common/logger/context-logger';
import type { Ctx } from '../../common/types/context';
import type { GatewayApiCallLog } from './gateways.domain';

const LOCK_ID = 'scheduler:gateway:process-refunds';
const LOCK_TTL_SECONDS = 300; // 5 minutes

@Injectable()
export class GatewayRefundsScheduler {
  private readonly logger = new ContextLogger(GatewayRefundsScheduler.name);

  constructor(
    private readonly gatewayPaymentsService: GatewayPaymentsService,
    private readonly ualaBisProvider: UalaBisProvider,
    private readonly paymentMethodsService: PaymentMethodsService,
    private readonly lockService: DistributedLockService,
    private readonly cronMetrics: CronMetricsService,
  ) {}

  private makeCtx(): Ctx {
    return { source: 'CRON', requestId: `cron_${Date.now()}_${randomBytes(4).toString('hex')}`, scheduledJobName: 'processPendingRefunds' };
  }

  private getProvider(provider: string) {
    if (provider === 'uala_bis') return this.ualaBisProvider;
    throw new Error(`No refund provider for: ${provider}`);
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async processPendingRefunds(): Promise<void> {
    await this.cronMetrics.run('processPendingGatewayRefunds', async () => {
      const ctx = this.makeCtx();
      await this.lockService.withLockAndLog(ctx, LOCK_ID, LOCK_TTL_SECONDS, async () => {
        const refunds = await this.gatewayPaymentsService.getPendingRefunds(ctx);
        for (const refund of refunds) {
          const startedAt = new Date();
          const endpoint = `POST /orders/${refund.providerOrderId}/refund`;
          try {
            await this.gatewayPaymentsService.updateRefundStatus(ctx, refund.id, 'Processing');

            const paymentMethod = await this.paymentMethodsService.findById(ctx, refund.paymentMethodId);
            const provider = this.getProvider(refund.provider);
            await provider.refundOrder(ctx, refund.providerOrderId, { amount: refund.amount, currency: refund.currency }, paymentMethod);

            const apiCallLog: GatewayApiCallLog = {
              timestamp: startedAt.toISOString(),
              endpoint,
              requestBody: { amount: (refund.amount / 100).toFixed(2) },
              responseBody: { status: 'INITIATED' },
              httpStatus: 200,
            };
            await this.gatewayPaymentsService.updateRefundStatus(ctx, refund.id, 'Processed', apiCallLog);
            this.logger.log(ctx, `Refund ${refund.id} processed for order ${refund.providerOrderId}`);
          } catch (error) {
            const apiCallLog: GatewayApiCallLog = {
              timestamp: startedAt.toISOString(),
              endpoint,
              requestBody: { amount: (refund.amount / 100).toFixed(2) },
              responseBody: { error: String(error) },
              httpStatus: 0,
            };
            await this.gatewayPaymentsService.updateRefundStatus(ctx, refund.id, 'Failed', apiCallLog);
            this.logger.warn(ctx, `Refund ${refund.id} failed: ${error}`);
          }
        }
        return refunds.length;
      });
    });
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd backend && npx jest test/unit/modules/gateways/gateway-refunds.scheduler.spec.ts
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/gateways/gateway-refunds.scheduler.ts backend/test/unit/modules/gateways/gateway-refunds.scheduler.spec.ts
git commit -m "feat: implement GatewayRefundsScheduler — processes pending refunds every 5 minutes"
```

---

## Task 12: Wire `GatewaysModule` and run full test suite

**Files:**
- Create: `backend/src/modules/gateways/gateways.module.ts`
- Modify: `backend/src/modules/payments/payments.module.ts`

- [ ] **Step 1: Create `gateways.module.ts`**

```ts
// backend/src/modules/gateways/gateways.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { GatewayPaymentsService } from './gateway-payments.service';
import { GatewayPaymentsScheduler } from './gateway-payments.scheduler';
import { GatewayRefundsScheduler } from './gateway-refunds.scheduler';
import { UalaBisProvider } from './providers/uala-bis.provider';
import { MercadoPagoProvider } from './providers/mercadopago.provider';
import { GatewayOrdersRepository } from './gateway-orders.repository';
import { GatewayRefundsRepository } from './gateway-refunds.repository';
import { GATEWAY_ORDERS_REPOSITORY } from './gateway-orders.repository.interface';
import { GATEWAY_REFUNDS_REPOSITORY } from './gateway-refunds.repository.interface';
import { PaymentsModule } from '../payments/payments.module';
import { TransactionManagerModule } from '../../common/database';
import { MetricsModule } from '../../common/metrics/metrics.module';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [
    TransactionManagerModule,
    MetricsModule,
    PaymentsModule,
    forwardRef(() => TransactionsModule),
  ],
  providers: [
    GatewayPaymentsService,
    GatewayPaymentsScheduler,
    GatewayRefundsScheduler,
    UalaBisProvider,
    MercadoPagoProvider,
    { provide: GATEWAY_ORDERS_REPOSITORY, useClass: GatewayOrdersRepository },
    { provide: GATEWAY_REFUNDS_REPOSITORY, useClass: GatewayRefundsRepository },
  ],
  exports: [GatewayPaymentsService, UalaBisProvider],
})
export class GatewaysModule {}
```

- [ ] **Step 2: Import `GatewaysModule` in `PaymentsModule`**

Add `GatewaysModule` to the imports array in `payments.module.ts` (wrapped in `forwardRef` if needed):

```ts
import { GatewaysModule } from '../gateways/gateways.module';
// ...
imports: [..., forwardRef(() => GatewaysModule)],
exports: [..., GatewayPaymentsService],  // re-export so PaymentsController can use it
```

- [ ] **Step 3: Final compile check**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run all unit tests**

```bash
cd backend && npx jest test/unit --passWithNoTests
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/gateways/gateways.module.ts backend/src/modules/payments/payments.module.ts
git commit -m "feat: wire GatewaysModule — gateway payments integration complete"
```
