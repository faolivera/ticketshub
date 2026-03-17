# Transaction Page — Complete Reference

**Route**: `/transaction/:transactionId`  
**Component**: `MyTicket.tsx`  
**Access**: Protected — authenticated users only (buyer or seller of the transaction)

---

## Table of Contents

1. [Overview](#overview)
2. [Transaction Status Lifecycle](#transaction-status-lifecycle)
3. [Page Data Loading](#page-data-loading)
4. [Roles and Computed Values](#roles-and-computed-values)
5. [Buyer Interactions](#buyer-interactions)
6. [Seller Interactions](#seller-interactions)
7. [Chat Feature](#chat-feature)
8. [Report a Problem / Dispute](#report-a-problem--dispute)
9. [Reviews](#reviews)
10. [Admin Actions](#admin-actions)
11. [Background Schedulers](#background-schedulers)
12. [Notification Events](#notification-events)
13. [Error Handling](#error-handling)
14. [API Reference](#api-reference)
15. [Flow Diagrams](#flow-diagrams)

---

## Overview

The transaction page is the central hub for a ticket sale between a buyer and a seller. It renders differently based on the current user's role (buyer vs. seller) and the current transaction status. It provides:

- Status tracking with a progress stepper
- Payment instructions and proof upload (buyer)
- Ticket transfer confirmation (seller)
- Receipt confirmation (buyer)
- Real-time chat between buyer and seller
- Dispute reporting
- Post-completion reviews

---

## Transaction Status Lifecycle

```
PendingPayment
  │
  ├─(buyer uploads bank transfer proof)────► PaymentPendingVerification
  │                                                 │
  │                                    (admin approves / payment webhook)
  │                                                 │
  └─(payment gateway webhook)──────────────► PaymentReceived
                                                    │
                                        (seller confirms transfer)
                                                    │
                                             TicketTransferred
                                                    │
                                         (buyer confirms receipt)
                                                    │
                                              DepositHold
                                                    │
                              (depositReleaseAt reached — scheduler)
                                                    │
                                            TransferringFund
                                                    │
                                        (admin completes payout)
                                                    │
                                               Completed

At any point:
  ├─(buyer cancels in PendingPayment/PaymentPendingVerification)──► Cancelled (BuyerCancelled)
  ├─(payment expires — scheduler)──────────────────────────────────► Cancelled (PaymentTimeout)
  ├─(admin review timeout — scheduler)─────────────────────────────► Cancelled (AdminReviewTimeout)
  ├─(admin rejects manual payment)─────────────────────────────────► Cancelled (AdminRejected)
  ├─(dispute opened from PaymentReceived/TicketTransferred/DepositHold)─► Disputed
  └─(admin refunds)────────────────────────────────────────────────► Refunded
```

### Status → Required Actor

| Status | Required Actor | Meaning |
|---|---|---|
| `PendingPayment` | Buyer | Buyer must pay |
| `PaymentPendingVerification` | Platform | Admin must verify manual payment |
| `PaymentReceived` | Seller | Seller must send the ticket |
| `TicketTransferred` | Buyer | Buyer must confirm receipt |
| `DepositHold` | None | Funds held in escrow, waiting for release date |
| `TransferringFund` | Platform | Admin processes payout to seller |
| `Completed` | None | Transaction finished |
| `Disputed` | Platform | Under dispute resolution |
| `Refunded` | None | Buyer refunded |
| `Cancelled` | None | Transaction cancelled |

---

## Page Data Loading

### Initial Load

On mount, the page calls a single BFF endpoint:

```
GET /api/bff/transaction-details/:transactionId
```

**Returns** `GetTransactionDetailsResponse`:
```typescript
{
  transaction: TransactionWithDetails,
  paymentConfirmation: PaymentConfirmation | null,
  bankTransferConfig: BankTransferConfig | null,   // present for manual payment methods
  ticketUnits: TransactionTicketUnit[],
  paymentMethodPublicName: string | null,
  reviews: TransactionReviewsData,
  chat: TransactionDetailsChatConfig | null,
  counterpartyEmail: string | null                 // shown only to seller
}
```

**Side effect on load**: if `chat.hasUnreadMessages === true`, the chat panel auto-opens and `chatWasAutoOpened` is set to `true`.

### Refetch

`refetch()` calls the same BFF endpoint again. It is triggered after:
- Cancelling the transaction
- Seller confirms transfer
- Buyer confirms receipt
- Submitting a dispute

---

## Roles and Computed Values

```typescript
isBuyer  = transaction.buyerId === currentUser.id
isSeller = transaction.sellerId === currentUser.id

isManualPayment = bankTransferConfig !== null

// Local countdown: page treats the transaction as Cancelled before the server reflects it
isPaymentExpiredLocally = (status === PendingPayment) && countdown has reached 0

effectiveStatus          = isPaymentExpiredLocally ? Cancelled : transaction.status
effectiveCancellationReason = isPaymentExpiredLocally ? PaymentTimeout : transaction.cancellationReason

// Progress stepper scale
statusStep (buyer)  = 0–3  (Pay → Sent → Received → Done)
statusStep (seller) = 0–5  (Payment → Confirmed → Send Ticket → Confirm → Released → Done)
```

---

## Buyer Interactions

### 1. Bank Transfer — View Payment Instructions

**When**: `status === PendingPayment && isBuyer && bankTransferConfig && !paymentConfirmation`

**Shown**:
- Bank name, CBU/account number, account holder name, CUIT
- Payment expiration countdown timer
- "Copy CBU" button → copies to clipboard, shows 2-second feedback

---

### 2. Bank Transfer — Upload Payment Proof

**When**: `status === PendingPayment && isBuyer && bankTransferConfig && !paymentConfirmation && !expired`

**Interaction**:
1. User clicks "Upload proof of payment"
2. File picker opens — accepts `image/png`, `image/jpeg`, `image/jpg`, `image/webp`, `application/pdf`, max **10 MB**
3. Upload state shown with spinner
4. On success: page status updates locally to `PaymentPendingVerification`

**Endpoint called**:
```
POST /api/payment-confirmations/:transactionId
Content-Type: multipart/form-data
Body: { file: <binary> }
```

**Error**: displayed inline beneath the upload button.

---

### 3. Preview Uploaded Payment Proof

**When**: `status === PaymentPendingVerification && isBuyer && paymentConfirmation`

**Interaction**:
1. User clicks "Preview"
2. Loading spinner shown
3. A signed blob URL is fetched from the server
4. File rendered in an iframe inside a modal

**Endpoint called** (internal service): `paymentConfirmationsService.getFileBlobUrl(transactionId)`

---

### 4. Cancel Transaction

**When**: `status === PendingPayment && isBuyer` (also available in `PaymentPendingVerification`)

**Interaction**:
1. User clicks "Cancel"
2. Confirmation dialog appears
3. On confirm: spinner → cancel request → `refetch()`

**Endpoint called**:
```
POST /api/transactions/:transactionId/cancel
```

**Backend behavior**: restores ticket units to `Available`, moves transaction to `Cancelled (BuyerCancelled)`.

---

### 5. Confirm Receipt of Ticket

**When**: `status === TicketTransferred && isBuyer`

**Interaction**:
1. User clicks "Confirm Receipt"
2. Modal opens
3. (Optional) User uploads a receipt proof file — same file constraints as payment proof (≤ 10 MB, image/pdf)
4. If uploading proof: `POST /api/transactions/:transactionId/receipt-proof`
5. User clicks confirm → `POST /api/transactions/:transactionId/confirm`
6. `refetch()` on success → status moves to `DepositHold`

**Endpoints called**:
```
POST /api/transactions/:transactionId/receipt-proof    (optional)
Content-Type: multipart/form-data
Body: { file: <binary> }

POST /api/transactions/:transactionId/confirm
Body: { confirmed: true, receiptProof?: string, receiptProofOriginalFilename?: string }
```

**Backend behavior**: locks transaction, moves to `DepositHold`.

---

### 6. Local Payment Expiration (Countdown)

**When**: `status === PendingPayment && isBuyer && bankTransferConfig`

The page renders a live countdown using `transaction.paymentExpiresAt`. When the countdown reaches zero:
- `isPaymentExpiredLocally` becomes `true`
- The page immediately renders as if `status === Cancelled` with reason `PaymentTimeout`
- No API call is made — the server scheduler handles the actual cancellation asynchronously

---

## Seller Interactions

### 1. View Counterparty Email

**When**: seller is viewing the transaction

The buyer's email (`counterpartyEmail`) is shown in the transaction details, provided by the BFF response.

### 2. Confirm Ticket Transfer

**When**: `status === PaymentReceived && isSeller`

This is a 2-step modal:

**Step 1 — How was the ticket sent?**
The seller selects one of:
- `ticketera` — sent via ticketing platform
- `pdf_or_image` — sent as PDF or image file
- `other` — other method (requires free-text description)

**Step 2 — Upload proof (optional)**
The seller may upload a transfer proof file (image/pdf, ≤ 5 MB server-side).

**Endpoints called** (in sequence):
```
POST /api/transactions/:transactionId/transfer-proof    (optional)
Content-Type: multipart/form-data
Body: { file: <binary> }

POST /api/transactions/:transactionId/transfer
Body: {
  payloadType: 'ticketera' | 'pdf_or_image' | 'other',
  payloadTypeOtherText?: string,
  transferProof?: string   // storageKey from upload step
}
```

**Backend behavior**:
- Locks transaction with pessimistic lock
- Validates seller is the actor and status is `PaymentReceived`
- Moves to `TicketTransferred`
- Emits `TICKET_TRANSFERRED` notification to buyer
- If `payloadType` provided: creates a `delivery`-type chat message (fire-and-forget)

`refetch()` is called on success.

---

## Chat Feature

### Enabling Rules

| Status | Chat Mode | Can Send | Can Read |
|---|---|---|---|
| `PendingPayment` | disabled | No | No |
| `PaymentPendingVerification` | disabled | No | No |
| `PaymentReceived` | **enabled** | Yes | Yes |
| `TicketTransferred` | **enabled** | Yes | Yes |
| `DepositHold` | only_read | No | Yes |
| `TransferringFund` | only_read | No | Yes |
| `Completed` | only_read | No | Yes |
| `Disputed` | disabled | No | No |
| `Refunded` | disabled | No | No |
| `Cancelled` | disabled | No | No |

### Chat Button Visibility

- `chatConfig.chatMode === 'enabled'` → "Message [counterpart name]" button
- `chatConfig.chatMode === 'only_read'` → "Read conversation" button
- `chatConfig === null` → no chat button shown

### Opening Chat

- **Manual**: user clicks the chat button → `isChatOpen = true`
- **Auto-open**: if `chat.hasUnreadMessages === true` on page load → chat panel opens automatically, `chatWasAutoOpened = true`

### Real-Time (Socket.IO)

On mount:
```
socket.emit('chat:join', { transactionId })
```

On unmount:
```
socket.emit('chat:leave', { transactionId })
```

Inbound handler:
```
socket.on('chat:message', (payload) => {
  if (payload.transactionId === transactionId && payload.senderId !== currentUser.id) {
    chatWasAutoOpened = true
    isChatOpen = true
  }
})
```

Messages are deduplicated by `id` before adding to local state.

### Polling Fallback

When the socket is disconnected, the page polls:
```
GET /api/transactions/:transactionId/chat/messages
```
at an interval of `chatConfig.chatPollIntervalSeconds` seconds.

### Sending a Message

1. User types in the input and presses Enter or clicks Send
2. `POST /api/transactions/:transactionId/chat/messages` with `{ content: string }`
3. Message appended locally on success
4. Error displayed inline under the input on failure

**Server constraints**: max content length 2,000 characters. Only allowed when `canSendTransactionChat` (status `PaymentReceived` or `TicketTransferred`). Platform config `transactionChatMaxMessages` sets global limit.

### Marking Messages as Read

- When chat was auto-opened (`chatWasAutoOpened === true`): on first click, focus, or keydown inside the panel → `PATCH /api/transactions/:transactionId/chat/read` (fires once via a ref guard)
- When loading messages via `GET /messages?markRead=true` (default): server marks as read automatically

### Loading Messages

```
GET /api/transactions/:transactionId/chat/messages?afterId=<id>&markRead=<bool>
```

`afterId` supports incremental fetching. `markRead` defaults to `true`.

---

## Report a Problem / Dispute

### When "Report a Problem" Is Available (`canOpenDispute`)

| Status | Buyer | Seller |
|---|---|---|
| `PaymentReceived` | Yes | No |
| `TicketTransferred` | Yes | Yes |
| `DepositHold` | Yes | No |
| All others | No | No |

### Dispute Modal Flow

```
User clicks "Report a problem"
        │
        ▼
chatConfig.chatMode === 'enabled' AND chat.hasExchangedMessages === false?
        │
   Yes  │  No
        │   └──────────────────────────────────────► Step: 'form'
        ▼
   Step: 'choice'
   "Try chatting first"  vs  "I want to report a problem"
        │
   User picks "Report" ──────────────────────────► Step: 'form'
        │
        ▼
   Step: 'form'
   - Subject (pre-filled from context)
   - Description (required)
   - Category (SupportCategory)
        │
   User submits ──► POST /api/support/tickets
        │
        ├── Success ──► Step: 'report_sent' (shows ticket ID)
        │
        └── Error (inline)
              ├── BAD_REQUEST         → "A report already exists"
              ├── CLAIM_TOO_EARLY     → "It's too soon to report"
              ├── CLAIM_TOO_LATE      → "The claim window has closed"
              ├── CLAIM_TICKET_NOT_TRANSFERRED → "Ticket has not been transferred yet"
              └── CLAIM_CONFIRM_RECEIPT_FIRST  → "Please confirm receipt first"
```

**Endpoint**:
```
POST /api/support/tickets
Body: {
  transactionId: string,
  category: SupportCategory,
  subject: string,
  description: string
}
```

**Backend behavior**: marks transaction as `Disputed`, sets `disputeId`. Transaction page then shows a link to `/support/:disputeId`.

---

## Reviews

**When shown**: `status === Completed`

**Conditions to show review form**:
- `reviewData.canReview === true`
- The current user has not yet submitted a review (`!reviewData.buyerReview` for buyer, `!reviewData.sellerReview` for seller)

**Interaction**:
1. User selects a rating: positive / neutral / negative (thumbs buttons)
2. User optionally writes a comment
3. User submits → `POST /api/reviews` with `{ transactionId, rating, comment? }`
4. On success: `GET /api/reviews/transaction/:transactionId` refreshed

**Errors**: displayed inline using i18n key `reviews.reviewError`.

---

## Admin Actions

Admin users access transactions via `/admin/transactions`.

### Approve / Reject Manual Payment

**When**: `status === PaymentPendingVerification` with `bankTransferConfig`

- **Approve**: `paymentConfirmationsService.updateStatus(confirmationId, 'Accepted')` → moves to `PaymentReceived`, holds escrow funds, emits `SELLER_PAYMENT_RECEIVED` notification
- **Reject**: opens dialog with optional rejection reason → `paymentConfirmationsService.updateStatus(confirmationId, 'Rejected', reason)` → moves to `Cancelled (AdminRejected)`

### View Proof Files

- **Buyer payment proof**: `paymentConfirmationsService.getFileBlobUrl(transactionId)` → rendered in iframe modal
- **Seller payout receipt**: `adminService.getPayoutReceiptFileBlobUrl(transactionId, fileId)` → rendered in iframe modal

### Edit Transaction

Admin can update all transaction fields directly: status, pricing, timeline timestamps, IDs, cancellation reason, `requiredActor`, etc.

**Endpoint**: `PATCH /api/transactions/:transactionId` (admin)

---

## Background Schedulers

These run server-side and change transaction status without any user action.

### Payment Expiration (every 30 seconds)

Finds all transactions in `PendingPayment` or `PaymentPendingVerification` where `paymentExpiresAt < now`:
- Calls `cancelTransaction(PaymentTimeout)`
- Restores ticket units to `Available`
- Batch limit: `scheduler.transactionBatchLimit` (default 100)

Also handles `adminReviewExpiresAt`: if a `PaymentPendingVerification` transaction has no admin decision by `adminReviewExpiresAt`, cancelled with reason `AdminReviewTimeout`.

### Deposit Release (every 5 minutes)

Finds all transactions in `DepositHold` or `TicketTransferred` where `depositReleaseAt < now`:
- Moves to `TransferringFund`

`depositReleaseAt` is set at purchase time:
- Verified seller: `eventDate + 24 hours`
- Unverified seller: `eventDate + 48 hours`

---

## Notification Events

| Event | Triggered When | Recipient |
|---|---|---|
| `BUYER_PAYMENT_APPROVED` | Payment webhook received → `PaymentReceived` | Buyer |
| `SELLER_PAYMENT_RECEIVED` | Admin approves manual payment | Seller |
| `TICKET_TRANSFERRED` | Seller confirms transfer | Buyer |
| `TRANSACTION_COMPLETED` | Admin completes payout | Both |
| `TRANSACTION_CANCELLED` | Transaction cancelled | Both |
| `TRANSACTION_EXPIRED` | Payment timeout | Both |

---

## Error Handling

| Interaction | Error Handling |
|---|---|
| Payment proof upload | Inline error under upload button |
| Cancel transaction | `console.error` only (no visible UI feedback) |
| Transfer confirmation | Inline error in modal |
| Receipt confirmation | Inline error in modal |
| Dispute submission | Rich inline error in modal — maps specific API error codes to user messages |
| Review submission | Inline error using i18n key `reviews.reviewError` |
| Chat send | Inline error under chat input |
| Page load failure | Full-page error state |

---

## API Reference

### BFF

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/bff/transaction-details/:id` | Full transaction page data |

### Transactions

| Method | Endpoint | Actor | Description |
|---|---|---|---|
| POST | `/api/transactions` | Buyer | Initiate purchase |
| GET | `/api/transactions/:id` | Buyer/Seller | Get transaction details |
| POST | `/api/transactions/:id/cancel` | Buyer | Cancel transaction |
| POST | `/api/transactions/:id/transfer-proof` | Seller | Upload transfer proof file |
| POST | `/api/transactions/:id/transfer` | Seller | Confirm ticket transfer |
| POST | `/api/transactions/:id/receipt-proof` | Buyer | Upload receipt proof file |
| POST | `/api/transactions/:id/confirm` | Buyer | Confirm ticket receipt |

### Chat

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/transactions/:id/chat/messages` | Get messages (optionally mark read) |
| POST | `/api/transactions/:id/chat/messages` | Send a message |
| PATCH | `/api/transactions/:id/chat/read` | Mark all messages as read |

### Payment Confirmations

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/payment-confirmations/:transactionId` | Upload buyer payment proof |

### Support / Dispute

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/support/tickets` | Submit a dispute/support ticket |

### Reviews

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/reviews/transaction/:id` | Get reviews for transaction |
| POST | `/api/reviews` | Submit a review |

### Socket.IO Events

| Direction | Event | Payload |
|---|---|---|
| Client → Server | `chat:join` | `{ transactionId }` |
| Client → Server | `chat:leave` | `{ transactionId }` |
| Server → Client (room) | `chat:message` | `{ ...TransactionChatMessage, transactionId }` |

Room name: `transaction:<transactionId>`

---

## Flow Diagrams

### Buyer: Upload Payment Proof

```
Buyer on /transaction/:id (PendingPayment, bank transfer)
        │
        ▼
Bank details shown (bankName, CBU, holder, CUIT)
        │
        ├── "Copy CBU" ──► clipboard, 2s feedback
        │
        ▼
Countdown timer running (paymentExpiresAt)
        │
        ├── Reaches 0 ──► isPaymentExpiredLocally = true ──► page renders as Cancelled (no API call)
        │
        ▼
User clicks "Upload proof of payment"
        │
        ▼
OS file picker opens (png/jpg/webp/pdf, max 10 MB)
        │
        ├── User cancels ──► nothing
        │
        ▼
isUploading = true, spinner shown
        │
        ▼
POST /api/payment-confirmations/:transactionId (multipart)
        │
        ├── Error ──► uploadError shown inline, isUploading = false
        │
        ▼
Success
        │
        ▼
Page status updates locally to PaymentPendingVerification
"Pending admin verification" message shown
Optional "Preview" button appears
        │
        ▼
Admin approves (via /admin/transactions)
        │
        ▼
Server moves transaction to PaymentReceived
Buyer receives BUYER_PAYMENT_APPROVED notification
Page reflects PaymentReceived on next visit / refetch
```

---

### Buyer: Confirm Receipt of Ticket

```
Buyer on /transaction/:id (TicketTransferred)
        │
        ▼
"Confirm Receipt" button visible
        │
        ▼
User clicks "Confirm Receipt"
        │
        ▼
Modal opens
        │
        ├── (Optional) User uploads receipt proof
        │         │
        │         ▼
        │   POST /api/transactions/:id/receipt-proof (multipart)
        │         │
        │         ├── Error ──► receiptProofError shown inline
        │         ▼
        │   storageKey returned, stored in state
        │
        ▼
User clicks "Confirm"
        │
        ▼
isConfirmingReceipt = true, button disabled
        │
        ▼
POST /api/transactions/:id/confirm
Body: { confirmed: true, receiptProof?, receiptProofOriginalFilename? }
        │
        ├── Error ──► error shown in modal
        │
        ▼
Success
        │
        ▼
Modal closes
refetch() ──► status is now DepositHold
        │
        ▼
Page shows "Funds held in escrow" message
Chat moves to only_read
Waiting for depositReleaseAt (scheduler) ──► TransferringFund ──► Admin payout ──► Completed
```

---

### Seller: Confirm Ticket Transfer

```
Seller on /transaction/:id (PaymentReceived)
        │
        ▼
"Confirm Transfer" button visible
        │
        ▼
User clicks "Confirm Transfer"
        │
        ▼
Modal opens — Step 1: How was the ticket sent?
        │
        ├── ticketera       (sent via ticketing platform)
        ├── pdf_or_image    (sent as file)
        └── other ──► free-text input required
        │
        ▼
User selects option and clicks "Next"
        │
        ▼
Modal — Step 2 (optional): Upload transfer proof
        │
        ├── User uploads file
        │         │
        │         ▼
        │   POST /api/transactions/:id/transfer-proof (multipart)
        │         │
        │         ├── Error ──► transferProofError shown inline
        │         ▼
        │   storageKey returned, stored in state
        │
        ▼
User clicks "Confirm Transfer"
        │
        ▼
isConfirmingTransfer = true
        │
        ▼
POST /api/transactions/:id/transfer
Body: { payloadType, payloadTypeOtherText?, transferProof? }
        │
        ├── Error ──► error shown in modal
        │
        ▼
Success
        │
        ├── Backend creates delivery chat message (fire-and-forget)
        ├── Emits TICKET_TRANSFERRED notification to buyer
        │
        ▼
Modal closes
refetch() ──► status is now TicketTransferred
        │
        ▼
Seller page shows "Waiting for buyer to confirm receipt"
Chat remains enabled (buyer/seller can still message)
```

---

### Chat: Enabled / Disabled Logic

```
Transaction status changes
        │
        ▼
BFF recalculates chatMode:
        │
        ├── PendingPayment              ──► chatMode: null        (no button)
        ├── PaymentPendingVerification  ──► chatMode: null        (no button)
        ├── PaymentReceived             ──► chatMode: 'enabled'   ("Message [name]" button)
        ├── TicketTransferred           ──► chatMode: 'enabled'   ("Message [name]" button)
        ├── DepositHold                 ──► chatMode: 'only_read' ("Read conversation" button)
        ├── TransferringFund            ──► chatMode: 'only_read' ("Read conversation" button)
        ├── Completed                   ──► chatMode: 'only_read' ("Read conversation" button)
        ├── Disputed                    ──► chatMode: null        (no button)
        ├── Refunded                    ──► chatMode: null        (no button)
        └── Cancelled                   ──► chatMode: null        (no button)

Page load:
        │
        ▼
chat.hasUnreadMessages === true?
        ├── Yes ──► isChatOpen = true, chatWasAutoOpened = true
        └── No  ──► chat stays closed

User clicks chat button:
        ├── 'enabled'   ──► isChatOpen = true (can send + read)
        └── 'only_read' ──► isChatOpen = true (read only, no input)

Socket.IO:
Incoming chat:message from other party ──► auto-opens chat panel
```

---

### Report a Problem: Enabled / Disabled Logic

```
Transaction status changes
        │
        ▼
canOpenDispute:
        ├── PaymentReceived  + isBuyer  ──► Yes
        ├── TicketTransferred + isBuyer  ──► Yes
        ├── TicketTransferred + isSeller ──► Yes
        ├── DepositHold      + isBuyer  ──► Yes
        └── All other statuses           ──► No (button not shown)

User clicks "Report a problem":
        │
        ▼
chatConfig.chatMode === 'enabled' AND chat.hasExchangedMessages === false?
        │
   Yes  │  No
        │   └──────────────────────────────────────► Skip to form
        ▼
Step: 'choice'
   ┌─────────────────────┬─────────────────────────┐
   │ "Message [name]"    │ "Report a problem"       │
   │ (opens chat panel)  │ (proceeds to form)       │
   └─────────────────────┴─────────────────────────┘
        │                           │
        ▼ (user chats first)        ▼
   Modal closes               Step: 'form'
                              - Subject (pre-filled)
                              - Description (required, min length)
                              - Category
                                    │
                              User submits
                                    │
                                    ▼
                         POST /api/support/tickets
                         { transactionId, category, subject, description }
                                    │
                         ┌──────────┴──────────┐
                         │ Error               │ Success
                         ▼                     ▼
                  Inline error msg      Step: 'report_sent'
                  (mapped by code)      shows support ticket ID
                                        link to /support/:ticketId

                  Error codes:
                  BAD_REQUEST                  → "A report already exists for this transaction"
                  CLAIM_TOO_EARLY              → "It is too early to open a dispute"
                  CLAIM_TOO_LATE               → "The dispute window has closed"
                  CLAIM_TICKET_NOT_TRANSFERRED → "The ticket has not been transferred yet"
                  CLAIM_CONFIRM_RECEIPT_FIRST  → "Please confirm receipt before reporting"
```
