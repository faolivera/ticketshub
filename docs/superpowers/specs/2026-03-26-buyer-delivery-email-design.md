# Buyer Delivery Email — Design Spec

**Date:** 2026-03-26
**Status:** Approved

## Problem

In step `PaymentReceived`, the seller sees the buyer's name but not their email. The seller needs the buyer's email to transfer the ticket (via ticketera or email). The buyer must provide (or confirm) the email they want to use for delivery. Once confirmed it is locked.

---

## Layout (Buyer view, `PaymentReceived`)

```
┌─────────────────────────────────────┐
│  📧 ¿A qué email te enviamos        │  ← BuyerDeliveryEmailCard (new)
│      las entradas?                  │
│                                     │
│  [usuario@ejemplo.com          ] [✓]│
│  Podés usar otro email si querés    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  → Pago confirmado —                │  ← ActionHero (existing)
│     [subtitle varies by email state]│
│  ─────────────────────────────────  │
│  TransferTimeline                   │
└─────────────────────────────────────┘
```

The email card renders **above** the `PaymentReceived` ActionHero in `BuyerActionBlock`.

---

## ActionHero subtitle (buyer, `PaymentReceived`)

| Email state | Subtitle |
|-------------|----------|
| Not yet confirmed | "Indicanos a qué email enviarte las entradas antes de que el vendedor transfiera." |
| Confirmed | "Esperando que el vendedor transfiera tu entrada." (existing text) |

---

## `BuyerDeliveryEmailCard` component

**File:** `frontend/src/app/components/transaction/BuyerDeliveryEmailCard.tsx`

### Unconfirmed state
- Title: "¿A qué email te enviamos las entradas?"
- Input pre-filled with `currentUserEmail`
- Hint text: "Podés usar otro email si querés."
- Button: "Confirmar email" — calls `onConfirm(email)`
- Basic email format validation before submit
- Loading state on button while saving

### Confirmed state
- Shows `✓ email@ejemplo.com` in green (`SUCCESS` token)
- Small muted text: "No puede modificarse"
- No input, no button

### Props
```ts
interface BuyerDeliveryEmailCardProps {
  deliveryEmail: string | null;       // null = not yet confirmed
  currentUserEmail: string;           // pre-fill value
  onConfirm: (email: string) => Promise<void>;
}
```

---

## Seller view (`PaymentReceived`)

In `SellerActionBlock`, inside the buyer disclaimer box (`buyerDisclaimerTitle`), add a row showing the delivery email when set:

```
Comprá verificado: Mica L.
Email de entrega: mica@ejemplo.com   ← new row, only when buyerDeliveryEmail is set
```

If `buyerDeliveryEmail` is null, the row is omitted (seller waits for buyer to confirm).

---

## Backend changes

### 1. Prisma schema
Add field to `Transaction` model:
```prisma
buyerDeliveryEmail  String?
```

Migration: `add_buyer_delivery_email_to_transactions`.

### 2. Domain type
Add to `TransactionWithDetails` in `transactions.domain.ts`:
```ts
buyerDeliveryEmail: string | null;
```

### 3. Repository
Update `toTransactionWithDetails` mapper to include `buyerDeliveryEmail`.

### 4. New endpoint
```
PATCH /api/transactions/:id/buyer-delivery-email
```
- Auth: `JwtAuthGuard` + buyer-only check
- Allowed only when `status === PaymentReceived`
- If `buyerDeliveryEmail` already set → `409 ConflictException`
- Request body: `{ email: string }` — validated with Zod (valid email format, max 254 chars)
- Persists to DB, returns updated `TransactionWithDetails` (via BFF shape)

**API types** go in `transactions.api.ts`:
```ts
export const SetBuyerDeliveryEmailSchema = z.object({
  email: z.string().email().max(254),
});
export type SetBuyerDeliveryEmailRequest = z.infer<typeof SetBuyerDeliveryEmailSchema>;
export type SetBuyerDeliveryEmailResponse = BffTransactionWithDetails;
```

### 5. Service method
```ts
async setBuyerDeliveryEmail(ctx, transactionId, userId, email): Promise<TransactionWithDetails>
```
- Fetch transaction, verify caller is buyer
- Verify status is `PaymentReceived`
- Verify `buyerDeliveryEmail` is null (not already set)
- Persist via repository
- Return updated `TransactionWithDetails`

---

## Frontend changes

### `frontend/src/api/types/transactions.ts`
Add to `TransactionWithDetails`:
```ts
buyerDeliveryEmail: string | null;
```

### `frontend/src/api/services/transactions.service.ts`
New method:
```ts
setBuyerDeliveryEmail(transactionId: string, email: string): Promise<TransactionWithDetails>
```
Calls `PATCH /api/transactions/:id/buyer-delivery-email`.

### `frontend/src/app/components/transaction/types.ts`
Add to `BuyerActionBlockProps`:
```ts
deliveryEmail: string | null;
currentUserEmail: string;
onConfirmDeliveryEmail: (email: string) => Promise<void>;
```

### `frontend/src/app/pages/MyTicket.tsx`
- Pass `deliveryEmail={transaction.buyerDeliveryEmail}` and `currentUserEmail` (from auth context) to `BuyerActionBlock`
- Implement `onConfirmDeliveryEmail` handler: calls service, updates local `transaction` state

### `frontend/src/app/components/transaction/BuyerActionBlock.tsx`
- Destructure new props
- In `PaymentReceived` block: render `<BuyerDeliveryEmailCard>` above the `<ActionHero>`
- Pass `deliveryEmail !== null` to choose ActionHero subtitle

### `frontend/src/app/components/transaction/SellerActionBlock.tsx`
- In `PaymentReceived` block, inside buyer disclaimer box: add email row when `transaction.buyerDeliveryEmail` is set

---

## i18n keys (en + es)

| Key | EN | ES |
|-----|----|----|
| `transaction.deliveryEmail.cardTitle` | "What email should we send your tickets to?" | "¿A qué email te enviamos las entradas?" |
| `transaction.deliveryEmail.hint` | "You can use a different email if you want." | "Podés usar otro email si querés." |
| `transaction.deliveryEmail.confirmButton` | "Confirm email" | "Confirmar email" |
| `transaction.deliveryEmail.lockedHint` | "Cannot be changed" | "No puede modificarse" |
| `transaction.hero.buyerPaymentReceivedNoEmailSubtitle` | "Tell us what email to send your tickets to before the seller transfers." | "Indicanos a qué email enviarte las entradas antes de que el vendedor transfiera." |
| `myTicket.buyerDisclaimerEmail` | "Delivery email: {{email}}" | "Email de entrega: {{email}}" |

---

## Unit tests

New test cases in `bff.service.spec.ts` or a new `transactions.service.spec.ts` suite:
- Happy path: buyer sets email in `PaymentReceived` → persisted, returned
- Already set: returns 409
- Wrong status (e.g. `PendingPayment`): returns 400/403
- Non-buyer caller: returns 403
