# Payment Failure & Transaction Cancellation — Design

**Date:** 2026-02-27  
**Status:** Approved

## Overview

This design addresses the handling of payment failures and transaction cancellations in TicketsHub. When a payment fails (gateway failure, timeout, or admin rejection), the transaction should be cancelled and reserved tickets should be made available again.

## Requirements

1. All payment failures should cancel the transaction and restore tickets
2. Transaction tracks who cancelled (`cancelledBy`) and why (`cancellationReason`)
3. 10-minute payment window for all payment methods
4. 24-hour admin review window for manual payments (bank transfer)
5. Buyer can cancel before paying (via cancel button)
6. Countdown timer displayed on transaction page

## Domain Changes

### New Enum: `CancellationReason`

```typescript
export enum CancellationReason {
  BuyerCancelled = 'BuyerCancelled',
  PaymentFailed = 'PaymentFailed',
  PaymentTimeout = 'PaymentTimeout',
  AdminRejected = 'AdminRejected',
  AdminReviewTimeout = 'AdminReviewTimeout',
}
```

### New Fields on `Transaction`

| Field | Type | Description |
|-------|------|-------------|
| `cancelledBy` | `RequiredActor?` | Who cancelled the transaction (Buyer, Platform) |
| `cancellationReason` | `CancellationReason?` | Why the transaction was cancelled |
| `paymentExpiresAt` | `Date` | When payment window expires (createdAt + 10 minutes) |
| `adminReviewExpiresAt` | `Date?` | When admin review expires (set when confirmation uploaded, +24 hours) |

## Cancellation Triggers

| Trigger | Actor | Reason | When |
|---------|-------|--------|------|
| Buyer clicks cancel | Buyer | BuyerCancelled | Manual action |
| Gateway webhook fails | Platform | PaymentFailed | Webhook callback |
| 10-min timer expires | Platform | PaymentTimeout | Cron job (30s interval) |
| Admin rejects confirmation | Platform | AdminRejected | Manual admin action |
| 24-hour review expires | Platform | AdminReviewTimeout | Cron job (30s interval) |

## Transaction State Flow

```
                    ┌─────────────────┐
                    │ initiatePurchase│
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
              ┌─────│ PendingPayment  │─────┐
              │     └────────┬────────┘     │
              │              │              │
    ┌─────────┴──────┐       │     ┌────────┴─────────┐
    │ Buyer cancels  │       │     │ 10-min timeout   │
    │ (BuyerCancelled)       │     │ (PaymentTimeout) │
    └─────────┬──────┘       │     └────────┬─────────┘
              │              │              │
              │              ▼              │
              │     ┌─────────────────┐     │
              │     │ Payment received│     │
              │     │ (gateway) OR    │     │
              │     │ confirmation    │     │
              │     │ uploaded        │     │
              │     └────────┬────────┘     │
              │              │              │
              │              ▼              │
              │    ┌──────────────────────┐ │
              │    │PaymentPendingVerify  │ │
              │    │ (manual only)        │ │
              │    └──────────┬───────────┘ │
              │         ┌─────┴─────┐       │
              │         │           │       │
              │    ┌────┴───┐ ┌─────┴─────┐ │
              │    │Approved│ │Rejected/  │ │
              │    │        │ │24h timeout│ │
              │    └────┬───┘ └─────┬─────┘ │
              │         │           │       │
              │         ▼           │       │
              │  ┌─────────────┐    │       │
              │  │PaymentRecvd │    │       │
              │  └─────────────┘    │       │
              │                     │       │
              ▼                     ▼       ▼
         ┌─────────────────────────────────────┐
         │            Cancelled                │
         │  (tickets restored to listing)      │
         └─────────────────────────────────────┘
```

## Backend Implementation

### 1. Install Scheduler Package

```bash
npm install @nestjs/schedule
```

### 2. Create TransactionsScheduler

New file: `backend/src/modules/transactions/transactions.scheduler.ts`

- Runs every 30 seconds
- Calls `cancelExpiredPendingPayments()` for 10-minute timeout
- Calls `cancelExpiredAdminReviews()` for 24-hour timeout

### 3. TransactionsService Changes

| Method | Change |
|--------|--------|
| `initiatePurchase` | Set `paymentExpiresAt` to `createdAt + 10 minutes` |
| `cancelTransaction` | Update signature to accept `cancelledBy` and `cancellationReason` |
| `handlePaymentConfirmationUploaded` | Set `adminReviewExpiresAt` to `now + 24 hours` |
| `approveManualPayment` (rejection) | Call `cancelTransaction` with `Platform/AdminRejected` |
| NEW: `handlePaymentFailed` | Cancel with `Platform/PaymentFailed` |
| NEW: `cancelExpiredPendingPayments` | Cancel transactions past 10-min window |
| NEW: `cancelExpiredAdminReviews` | Cancel transactions past 24-hour review window |

### 4. Module Setup

- Import `ScheduleModule.forRoot()` in `AppModule`
- Register `TransactionsScheduler` as provider in `TransactionsModule`

## Frontend Implementation

### 1. Countdown Timer Component

- Displayed when transaction status is `PendingPayment`
- Uses `paymentExpiresAt` to calculate remaining time
- Updates every second (client-side)
- Shows MM:SS format
- When timer reaches 0: show "Payment expired" message and refetch transaction

### 2. Cancel Button

- Visible when status is `PendingPayment`
- Shows confirmation dialog before cancelling
- Calls `POST /transactions/:id/cancel`

### 3. Cancelled State Display

Show human-readable cancellation reason:

| Reason | Display Text (EN) |
|--------|-------------------|
| BuyerCancelled | "You cancelled this transaction" |
| PaymentFailed | "Payment failed" |
| PaymentTimeout | "Payment time expired" |
| AdminRejected | "Payment confirmation was rejected" |
| AdminReviewTimeout | "Payment review timed out" |

### 4. i18n Keys

Add to `frontend/src/i18n/locales/en.json` and `es.json`:

```json
{
  "transaction.timeRemaining": "Time remaining: {{time}}",
  "transaction.cancelButton": "Cancel Transaction",
  "transaction.cancelConfirm": "Are you sure you want to cancel this transaction?",
  "transaction.cancelled.BuyerCancelled": "You cancelled this transaction",
  "transaction.cancelled.PaymentFailed": "Payment failed",
  "transaction.cancelled.PaymentTimeout": "Payment time expired",
  "transaction.cancelled.AdminRejected": "Payment confirmation was rejected",
  "transaction.cancelled.AdminReviewTimeout": "Payment review timed out"
}
```

## API Changes

### Transaction Response

Include new fields in all transaction responses:

```typescript
interface TransactionResponse {
  // ... existing fields ...
  paymentExpiresAt: string;        // ISO date
  adminReviewExpiresAt?: string;   // ISO date, only for manual payments
  cancelledBy?: RequiredActor;
  cancellationReason?: CancellationReason;
}
```

## Configuration

Timeout values should be configurable via environment/config:

| Config Key | Default | Description |
|------------|---------|-------------|
| `PAYMENT_TIMEOUT_MINUTES` | 10 | Minutes before payment expires |
| `ADMIN_REVIEW_TIMEOUT_HOURS` | 24 | Hours before admin review expires |

## Testing

1. Unit tests for new service methods
2. Unit tests for scheduler
3. E2E test: buyer cancellation flow
4. E2E test: payment timeout flow
5. E2E test: admin rejection flow
6. E2E test: admin review timeout flow
