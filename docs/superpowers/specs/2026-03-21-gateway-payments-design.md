# Gateway Payments Integration — Design Spec

**Date:** 2026-03-21
**Scope:** Backend only. Ualá Bis integration with MercadoPago scaffolded. No frontend changes.

---

## 1. Context

The platform currently has a `PaymentsService` mock and a `PaymentMethodsService` that manages payment method records (including `payment_gateway` types with provider-specific credentials loaded from env). No real gateway integration exists.

This spec defines the backend infrastructure to process charges via external payment gateways, starting with Ualá Bis.

---

## 2. Architecture

### New module: `src/modules/gateways/`

```
gateways/
  gateways.module.ts
  gateway-payments.service.ts         ← dispatcher
  gateway-payments.scheduler.ts       ← polling for pending gateway orders
  gateway-refunds.scheduler.ts        ← processes pending refunds
  providers/
    gateway-provider.interface.ts     ← shared contract
    uala-bis.provider.ts
    mercadopago.provider.ts           ← skeleton only (no implementation)
```

`GatewaysModule` is imported by `PaymentsModule` and exports `GatewayPaymentsService`.

`TransactionsService` calls `GatewayPaymentsService` (instead of the mock `PaymentsService`) when the payment method type is `payment_gateway`.

### Provider interface

```ts
interface GatewayProvider {
  createOrder(ctx: Ctx, transactionId: string, amount: Money, description: string): Promise<GatewayOrder>
  getOrder(ctx: Ctx, providerOrderId: string): Promise<GatewayOrderStatus>
  refundOrder(ctx: Ctx, providerOrderId: string, amount: Money): Promise<void>
}

interface GatewayOrder {
  providerOrderId: string   // Ualá uuid / MP id
  checkoutUrl: string       // URL to redirect buyer to
}

type GatewayOrderStatus = 'pending' | 'approved' | 'rejected' | 'refunded' | 'cancelled'
// 'cancelled' is set when the parent transaction is cancelled by the timeout scheduler
```

### Dispatcher (`GatewayPaymentsService`)

Receives the resolved `PaymentMethodOption`, selects the correct provider based on `gatewayProvider`, and delegates. Has no knowledge of provider-specific details.

---

## 3. Database Schema

### `GatewayOrder`

Links an internal transaction to an order in the external provider.

| Field | Type | Notes |
|---|---|---|
| id | string | `go_<timestamp>_<hex>` |
| transactionId | string | FK to Transaction |
| paymentMethodId | string | FK to PaymentMethod |
| provider | string | `uala_bis` \| `mercadopago` |
| providerOrderId | string | uuid from Ualá / id from MP |
| checkoutUrl | text | redirect URL for buyer (TEXT column, not VARCHAR) |
| status | string | `pending` \| `approved` \| `rejected` \| `refunded` \| `cancelled` |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### `GatewayRefund`

Stores refund requests and their API audit log.

| Field | Type | Notes |
|---|---|---|
| id | string | `gr_<timestamp>_<hex>` |
| transactionId | string | FK to cancelled Transaction |
| gatewayOrderId | string | FK to GatewayOrder |
| providerOrderId | string | uuid from provider (denormalized for direct API calls) |
| provider | string | `uala_bis` \| `mercadopago` |
| amount | number | in cents |
| currency | string | ISO currency code |
| status | string | `Pending` \| `Processing` \| `Processed` \| `Failed` |
| apiCallLog | JSON? | null until scheduler processes it |
| createdAt | DateTime | |
| updatedAt | DateTime | |

`apiCallLog` shape:
```ts
{
  timestamp: string     // ISO date
  endpoint: string      // e.g. "POST /orders/{uuid}/refund"
  requestBody: object   // sanitized — no tokens or secrets
  responseBody: object
  httpStatus: number
}
```

---

## 4. Ualá Bis Integration

### Prerequisites (in scope)

`PaymentMethodsService.getCredentialKeysForProvider` currently returns `['AUTH_TOKEN']` for `uala_bis`. This must be updated to `['USERNAME', 'CLIENT_ID', 'CLIENT_SECRET_ID']` as a prerequisite of the Ualá Bis provider. The Ualá auth endpoint requires all three to obtain a token.

### Authentication

- Credentials loaded via `PaymentMethodsService.getGatewayCredentials()` using the method's `gatewayConfigEnvPrefix`
- Required env vars (prefixed): `<PREFIX>_USERNAME`, `<PREFIX>_CLIENT_ID`, `<PREFIX>_CLIENT_SECRET_ID`
- Token cached in memory per `paymentMethodId`: `Map<string, { token: string; expiresAt: Date }>`
- Token refreshed if missing or within 5 minutes of expiry
- Auth endpoint:
  - Prod: `POST https://auth.developers.ar.ua.la/v2/api/auth/token`
  - Staging: `POST https://auth.stage.developers.ar.ua.la/v2/api/auth/token`
- Request body: `{ username, client_id, client_secret_id, grant_type: "client_credentials" }`
- Response: `{ access_token, expires_in, token_type: "Bearer" }`

### Create order

- `POST https://checkout.developers.ar.ua.la/v2/api/checkout`
- Body:
  ```json
  {
    "amount": "1500.00",
    "description": "Tickets — Event Name",
    "callback_success": "${FRONTEND_BASE_URL}/transactions/:id",
    "callback_fail": "${FRONTEND_BASE_URL}/transactions/:id",
    "notification_url": "<backend>/api/payments/webhook/uala-bis",
    "external_reference": "<transactionId>"
  }
  ```
- `callback_success` and `callback_fail` are both placeholders pointing to the transaction detail page. These are **not** payment confirmation signals — the actual approval arrives async via webhook or polling. A dedicated "payment processing" page is a frontend dependency outside this scope.
- Amount: converted from cents to decimal string with **2 decimal places** (`(amount / 100).toFixed(2)`). Min: 25.00, Max: 9,999,999.00.
- Response: `{ uuid, status: "PENDING", links: { checkout_link } }`
- Persists a `GatewayOrder` record in DB (within a DB transaction).
- Returns `{ providerOrderId: uuid, checkoutUrl: links.checkout_link }`.

### Get order status

- `GET https://checkout.developers.ar.ua.la/v2/api/orders/:uuid`
- Maps Ualá statuses to `GatewayOrderStatus`:
  - `APPROVED` / `PROCESSED` → `approved`
  - `PENDING` → `pending`
  - `REJECTED` → `rejected`
  - `REFUNDED` → `refunded`

### Refund

- `POST https://checkout.developers.ar.ua.la/v2/api/orders/:uuid/refund`
- Body: `{ "amount": "1500.00", "notification_url": "<backend>/api/payments/webhook/uala-bis" }`
- **Ualá only accepts refunds on orders with status `APPROVED`.**
- `APPROVED` and `PROCESSED` both map internally to `approved`, but Ualá will reject a refund call if the order is already in `PROCESSED` state. If this occurs, the `GatewayRefund` will move to `Failed`. The `apiCallLog.responseBody` will contain Ualá's rejection reason to aid admin triage.
- Called by `GatewayRefundsScheduler`, not directly from webhook/polling path.

---

## 5. Order Lifecycle

### Happy path

```
Buyer selects gateway method
  → TransactionsService calls GatewayPaymentsService.createOrder()
  → UalaBisProvider creates order on Ualá API
  → GatewayOrder persisted (status: pending) — within DB transaction
  → checkoutUrl returned to frontend via CreatePaymentIntentResponse.clientSecret
  → Buyer redirected to Ualá checkout
  → Buyer pays
  → Ualá sends webhook OR polling detects APPROVED
  → Transaction moves to PaymentReceived (within DB transaction)
```

### Timeout path

```
Payment deadline expires (existing scheduler)
  → TransactionsService.cancelTransaction() called
  → TransactionsService calls GatewayPaymentsService.handleTransactionCancelled(transactionId)
  → GatewayOrder status updated to 'cancelled' — within same DB transaction as Transaction cancel
```

`handleTransactionCancelled` is a new method on `GatewayPaymentsService` with the signature:

```ts
handleTransactionCancelled(ctx: TxCtx, transactionId: string): Promise<void>
```

It accepts a `TxCtx` (transaction context) so it participates in the same DB transaction opened by `cancelTransaction`. `TransactionsService` must pass the active transaction context when calling it, ensuring the `GatewayOrder` update and the `Transaction` cancel are committed atomically. This keeps the `GatewayOrder` in sync so the polling scheduler does not continue querying Ualá for a cancelled transaction.

### Late approval (post-cancellation)

```
Webhook / polling receives APPROVED on a cancelled transaction
  → GatewayRefund record created (status: Pending) — atomic with GatewayOrder status update
  → GatewayRefundsScheduler picks it up within 5 min
  → Calls Ualá refund API
  → Updates GatewayRefund status to Processed or Failed
  → Persists apiCallLog (including failure reason if Ualá rejects)
  → Failed refunds stay in Failed for manual admin review
```

---

## 6. Idempotency (webhook + polling race)

The webhook handler and the polling scheduler can race on the same order. Both call `getOrder()` and may both see `APPROVED` simultaneously.

To prevent double-processing:

1. The approve/reject handler opens a DB transaction and immediately fetches `GatewayOrder` **with a row lock** (`SELECT FOR UPDATE`).
2. If `GatewayOrder.status` is already `approved`, `rejected`, or `cancelled`, the handler returns early without any further updates.
3. Only the first caller proceeds to update `GatewayOrder` and call `handleGatewayPaymentApproved` / `handleGatewayPaymentRejected` on `TransactionsService`.

The existing `TransactionsService` handlers already use row locks for the `Transaction` record, so the combination prevents both double-payment and double-cancellation.

---

## 7. Webhook Endpoints

### `POST /api/payments/webhook/uala-bis`

- No JWT auth
- Ualá payload:
  ```json
  { "uuid": "...", "external_reference": "...", "status": "...", "created_date": "...", "api_version": "..." }
  ```
- Handler:
  1. Extract `uuid` from payload
  2. Call `UalaBisProvider.getOrder(uuid)` to verify status (prevents spoofing — Ualá has no webhook signature)
  3. Look up `GatewayOrder` by `providerOrderId` (with row lock — see Section 6)
  4. If `GatewayOrder.status` is already terminal, return `200` immediately
  5. Dispatch to `handleGatewayPaymentApproved` or `handleGatewayPaymentRejected` on `TransactionsService`
  6. Always respond `200` to prevent Ualá retries on processing errors

### `POST /api/payments/webhook/mercadopago`

- Placeholder endpoint, returns `200` with no-op body. To be implemented when MercadoPago integration is built.

---

## 8. Schedulers

Both schedulers must acquire a **distributed lock** (using the existing `DistributedLockService.withLockAndLog()` pattern) before processing their batch. The lock must remain held for the **entire duration of the batch run** (query + all per-item processing), not released between items. This prevents duplicate processing across multiple instances.

### `GatewayPaymentsScheduler` (polling)

- Runs every **2 minutes**
- Acquires distributed lock before processing
- Queries `GatewayOrder` records with `status = pending` where the associated transaction is still `PendingPayment`
- For each: calls `GatewayPaymentsService.syncOrderStatus()` → `getOrder()` → if changed, applies approve/reject flow (with row lock per Section 6)
- Wrapped in try/catch per order — one failure does not block others

### `GatewayRefundsScheduler`

- Runs every **5 minutes**
- Acquires distributed lock before processing
- Queries `GatewayRefund` records with `status = Pending`
- For each:
  1. Updates status to `Processing` (prevents double-processing if scheduler restarts mid-run)
  2. Calls provider `refundOrder()`
  3. Updates status to `Processed` or `Failed`
  4. Persists `apiCallLog` (timestamp, endpoint, sanitized request, response, HTTP status)
- Failed refunds stay `Failed` — no automatic retry, requires manual admin review

---

## 9. Atomicity

All operations affecting multiple DB entities use `TransactionManager.executeInTransaction()`. External API calls (Ualá HTTP requests) are always made **outside** DB transactions.

| Operation | Entities | DB Transaction |
|---|---|---|
| Create gateway order | `Transaction` (read) + `GatewayOrder` (create) | Yes |
| Approve payment (webhook/polling) | `Transaction` + `GatewayOrder` | Yes |
| Reject payment | `Transaction` + `GatewayOrder` | Yes |
| Transaction timeout cancel | `Transaction` + `GatewayOrder` | Yes |
| Late approval detected | `GatewayOrder` (update) + `GatewayRefund` (create) | Yes |
| Process refund (scheduler) | `GatewayRefund` only | Yes |

---

## 10. API Response to Frontend

`CreatePaymentIntentResponse.clientSecret` is reused to carry the `checkoutUrl` returned by the gateway. No API contract changes in this scope. Renaming to `redirectUrl` is deferred to a separate refactor.

`clientSecret` is a DTO response field only — not stored in DB — so there is no column size concern.

---

## 11. MercadoPago

`MercadoPagoProvider` is created as a skeleton implementing `GatewayProvider` with all methods throwing `NotImplementedException`. This registers the provider in the dispatcher without breaking anything. Full implementation is a separate scope.

---

## 12. Testing

- Unit tests for `GatewayPaymentsService` (dispatcher routing)
- Unit tests for `UalaBisProvider`: `createOrder`, `getOrder`, `refundOrder`, token cache logic (hit/miss/refresh)
- Unit tests for `GatewayPaymentsScheduler` and `GatewayRefundsScheduler` including distributed lock acquisition
- Unit tests for both webhook controllers: verify `getOrder` is called before updating, idempotency guard returns early if already terminal, always returns 200
- No automated integration tests against Ualá staging — manual testing only

---

## 13. Out of Scope

- MercadoPago full implementation
- Renaming `clientSecret` to `redirectUrl` in the API
- Admin UI for reviewing failed refunds
- Automatic retry of failed refunds
- Webhook signature verification (Ualá does not provide one)
- Frontend "payment processing" page (required for proper callback_success / callback_fail UX — tracked as a frontend dependency)
