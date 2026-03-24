# MercadoPago Checkout Pro Integration — Design Spec

**Date:** 2026-03-24
**Status:** Approved

---

## Overview

Implement the `MercadoPagoProvider` (currently stubbed with `NotImplementedException`) to support Checkout Pro payments. The provider integrates with the existing `GatewayPaymentsService` and `GatewayWebhooksController` using the same patterns established by `UalaBisProvider`.

---

## Context

The gateway module already has:
- `MercadoPagoProvider` scaffolded and registered in `GatewaysModule`
- `GatewayWebhooksController` with a placeholder `handleMercadoPago` endpoint
- `GatewayPaymentsService.getProvider()` already routes `'mercadopago'` to `MercadoPagoProvider`
- `PaymentMethodsService.getCredentialKeysForProvider('mercadopago')` already returns `['ACCESS_TOKEN', 'PUBLIC_KEY']`
- `GatewayCredentials` interface already has `accessToken` and `publicKey` fields

Credentials available: `access_token` and `public_key`. No webhook secret — signature validation is not implemented (same as Ualá Bis).

---

## MP Checkout Pro Flow

1. Backend creates a **preference** (`POST /checkout/preferences`) → MP returns `preference_id` and `init_point` (checkout URL)
2. Frontend redirects user to `init_point`
3. User pays on MP's hosted page
4. MP POSTs a webhook to `notification_url`: `{ type: "payment", data: { id: "paymentId" } }`
5. Backend calls `GET /v1/payments/{paymentId}` to get `preference_id` and `status`
6. Backend calls `handleOrderUpdate(ctx, preference_id)` — existing flow
7. `getOrder(ctx, preference_id)` queries `GET /merchant_orders/search?preference_id=X` for current status

---

## Key Design Decisions

### `providerOrderId` = `preference_id`

The preference ID serves as the stable order identifier (created at checkout start, persists through payment). Consistent with how Ualá Bis uses its order UUID.

### Webhook indirection

MP webhooks deliver a `paymentId`, not the `preference_id`. A single extra API call (`GET /v1/payments/{paymentId}`) maps it to the `preference_id`, then the existing `handleOrderUpdate` flow takes over.

### `getOrder` via merchant orders API

`GET /merchant_orders/search?preference_id={preferenceId}` returns all payments for a preference. We check if any payment is approved/rejected and map accordingly. This supports the polling path unchanged.

### `refundOrder` via merchant orders API

Same lookup as `getOrder` to find the `paymentId` of the approved payment, then `POST /v1/payments/{paymentId}/refunds`.

### No token refresh

MP `access_token` is a long-lived credential (no OAuth flow). Used directly in `Authorization: Bearer` header. No token cache needed (unlike Ualá Bis).

---

## API Endpoints Used

| Operation | Endpoint |
|---|---|
| Create preference | `POST https://api.mercadopago.com/checkout/preferences` |
| Fetch payment (webhook) | `GET https://api.mercadopago.com/v1/payments/{id}` |
| Get order status | `GET https://api.mercadopago.com/merchant_orders/search?preference_id={id}` |
| Create refund | `POST https://api.mercadopago.com/v1/payments/{paymentId}/refunds` |

All requests use `Authorization: Bearer {access_token}` header.

---

## Status Mapping

MP payment statuses → `GatewayProviderOrderStatus`:

| MP status | Internal status |
|---|---|
| `approved` | `approved` |
| `rejected` | `rejected` |
| `cancelled` | `rejected` |
| `refunded` | `refunded` |
| `charged_back` | `refunded` |
| `pending`, `authorized`, `in_process`, `in_mediation` | `pending` |

---

## Files to Change

### 1. `backend/src/modules/gateways/providers/mercadopago.provider.ts`

Implement `GatewayProvider` interface:

- **`createOrder(ctx, transactionId, amount, description, paymentMethod)`**
  - Gets `accessToken` from `paymentMethodsService.getGatewayCredentials()`
  - `POST /checkout/preferences` with:
    - `items: [{ title: description, quantity: 1, unit_price: amount.amount / 100, currency_id: amount.currency }]`
    - `external_reference: transactionId`
    - `notification_url: {backendUrl}/api/payments/webhook/mercadopago`
    - `back_urls: { success, failure, pending }` → all point to `{publicUrl}/transaction/{transactionId}`
    - `auto_return: 'approved'`
  - Returns `{ providerOrderId: preference_id, checkoutUrl: init_point }`
  - Uses `sandbox_init_point` when not in production

- **`getOrder(ctx, preferenceId, paymentMethod)`**
  - `GET /merchant_orders/search?preference_id={preferenceId}`
  - Iterates payments in the response, returns first non-pending resolved status
  - Returns `pending` if no payments or all pending

- **`refundOrder(ctx, preferenceId, amount, paymentMethod)`**
  - `GET /merchant_orders/search?preference_id={preferenceId}` → finds approved `paymentId`
  - `POST /v1/payments/{paymentId}/refunds` with `{ amount: amount.amount / 100 }` for partial, empty body for full

- **`fetchPayment(ctx, paymentId, paymentMethod)` (public, for webhook)**
  - `GET /v1/payments/{paymentId}`
  - Returns `{ preferenceId: string }`

Private helper: `getAccessToken(paymentMethod)` — reads from credentials, throws if missing.

### 2. `backend/src/modules/gateways/gateway-payments.service.ts`

Add one method:

- **`handleMercadoPagoWebhook(ctx, paymentId)`**
  - Calls `paymentMethodsService.findEnabled(ctx)` → finds first method with `gatewayProvider === 'mercadopago'`
  - Calls `mercadoPagoProvider.fetchPayment(ctx, paymentId, mpMethod)` → gets `preferenceId`
  - Calls `this.handleOrderUpdate(ctx, preferenceId)` (existing flow)

### 3. `backend/src/modules/gateways/gateway-webhooks.controller.ts`

Implement `handleMercadoPago`:
- Validates `body.type === 'payment'`
- Extracts `paymentId = body.data?.id`
- Logs and returns `{ received: true }` for non-payment types (MP sends other event types on startup)
- Calls `gatewayPaymentsService.handleMercadoPagoWebhook(ctx, paymentId)`

---

## Error Handling

- Missing `access_token` → throw `BadRequestException`
- MP API non-2xx → log error with status + body, throw `Error`
- Webhook with missing `data.id` → log warning, return `{ received: true }` (don't retry)
- No approved payment found for refund → throw `NotFoundException`

---

## What Does NOT Change

- `GatewaysModule` — MercadoPagoProvider already registered
- `GatewayOrdersRepository` — no schema changes
- `PaymentMethodsService` — credential keys already configured
- `GatewayPaymentsService.pollPendingOrders` — works unchanged via `getOrder`
- `GatewayPaymentsService.handleOrderUpdate` — works unchanged for MP (uses `providerOrderId = preference_id`)

---

## Unit Tests

File: `backend/src/test/unit/modules/gateways/mercadopago.provider.spec.ts`

Coverage per method:
- `createOrder`: happy path, MP API error
- `getOrder`: approved payment, rejected payment, no payments (pending), MP API error
- `refundOrder`: full refund, partial refund, no approved payment found
- `fetchPayment`: happy path, MP API error
