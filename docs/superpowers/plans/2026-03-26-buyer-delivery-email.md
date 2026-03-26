# Buyer Delivery Email Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the buyer confirm a delivery email in the `PaymentReceived` step so the seller can use it to transfer the ticket.

**Architecture:** Add `buyerDeliveryEmail` to the Prisma `Transaction` model and domain type. Expose a `PATCH /api/transactions/:id/buyer-delivery-email` endpoint (buyer-only, locked after first set). Frontend shows a `BuyerDeliveryEmailCard` above the existing ActionHero in `PaymentReceived`; seller sees the email inside the buyer disclaimer box.

**Tech Stack:** NestJS, Prisma/PostgreSQL, Zod, React 18, TailwindCSS, react-i18next

**Worktree:** `.worktrees/buyer-delivery-email` (branch `feature/buyer-delivery-email`)

---

### Task 1: Prisma schema + domain types

**Files:**
- Modify: `backend/prisma/schema.prisma` (Transaction model)
- Modify: `backend/src/modules/transactions/transactions.domain.ts`

- [ ] **Step 1: Add field to Prisma schema**

In `backend/prisma/schema.prisma`, inside `model Transaction { ... }`, after the `refundedAt` line (line ~575) add:

```prisma
  buyerDeliveryEmail        String?           @map("buyer_delivery_email")
```

- [ ] **Step 2: Run migration**

```bash
cd backend
npx prisma migrate dev --name add_buyer_delivery_email
```

Expected: new migration file created under `prisma/migrations/`, Prisma client regenerated.

- [ ] **Step 3: Add field to Transaction domain type**

In `backend/src/modules/transactions/transactions.domain.ts`, find the `Transaction` interface (around line 130) and add after `refundedAt`:

```ts
  /** Email the buyer wants to use for ticket delivery. Null until buyer confirms it. Locked after set. */
  buyerDeliveryEmail: string | null;
```

- [ ] **Step 4: Add field to TransactionWithDetails**

`TransactionWithDetails extends Transaction`, so the field is inherited automatically. No extra change needed there.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd backend
npx tsc --noEmit
```

Expected: zero errors (or only pre-existing unrelated errors).

- [ ] **Step 6: Commit**

```bash
cd backend
git add prisma/schema.prisma prisma/migrations src/modules/transactions/transactions.domain.ts
git commit -m "feat: add buyerDeliveryEmail field to Transaction"
```

---

### Task 2: Repository mapper + buildUpdateData

**Files:**
- Modify: `backend/src/modules/transactions/transactions.repository.ts`

- [ ] **Step 1: Add to mapToTransaction**

In `transactions.repository.ts`, find `mapToTransaction` (around line 789). After the `version:` line, add:

```ts
      buyerDeliveryEmail: (prismaTransaction as { buyerDeliveryEmail?: string | null }).buyerDeliveryEmail ?? null,
```

- [ ] **Step 2: Add to buildUpdateData**

In `buildUpdateData` (around line 318), after the `cancelledAt` block, add:

```ts
    if (updates.buyerDeliveryEmail !== undefined) {
      data.buyerDeliveryEmail = updates.buyerDeliveryEmail;
    }
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd backend
npx tsc --noEmit
```

Expected: zero new errors.

- [ ] **Step 4: Commit**

```bash
git add src/modules/transactions/transactions.repository.ts
git commit -m "feat: map buyerDeliveryEmail in repository"
```

---

### Task 3: API types, service method, and unit tests

**Files:**
- Modify: `backend/src/modules/transactions/transactions.api.ts`
- Modify: `backend/src/modules/transactions/transactions.service.ts`
- Modify: `backend/test/unit/modules/transactions/transactions.service.spec.ts`

- [ ] **Step 1: Add API types**

In `backend/src/modules/transactions/transactions.api.ts`, add at the end of the file:

```ts
import { z } from 'zod';

export const SetBuyerDeliveryEmailSchema = z.object({
  email: z.string().email().max(254),
});

export type SetBuyerDeliveryEmailRequest = z.infer<typeof SetBuyerDeliveryEmailSchema>;

export type SetBuyerDeliveryEmailResponse = TransactionWithDetails;
```

Note: `TransactionWithDetails` is already imported in this file (check imports; if not, add `import type { TransactionWithDetails } from './transactions.domain';`).

- [ ] **Step 2: Write failing tests**

In `backend/test/unit/modules/transactions/transactions.service.spec.ts`, add a new `describe` block at the end of the outer `describe('TransactionsService', ...)` block:

```ts
describe('setBuyerDeliveryEmail', () => {
  const mockTxPaymentReceived = createMockTransaction({
    status: TransactionStatus.PaymentReceived,
    buyerDeliveryEmail: null,
  });

  it('sets email when buyer calls in PaymentReceived', async () => {
    transactionsRepository.findById.mockResolvedValue(mockTxPaymentReceived);
    transactionsRepository.update.mockResolvedValue({
      ...mockTxPaymentReceived,
      buyerDeliveryEmail: 'buyer@example.com',
    });
    // enrichTransaction dependencies
    jest.spyOn(service as any, 'enrichTransaction').mockResolvedValue({
      ...mockTxPaymentReceived,
      buyerDeliveryEmail: 'buyer@example.com',
      eventName: 'Event',
      eventDate: new Date(),
      venue: 'Venue',
      sectionName: 'General',
      buyerName: 'Buyer',
      sellerName: 'Seller',
      buyerPic: null,
      sellerPic: null,
    });

    const result = await service.setBuyerDeliveryEmail(
      mockCtx,
      mockTxPaymentReceived.id,
      mockTxPaymentReceived.buyerId,
      'buyer@example.com',
    );

    expect(transactionsRepository.update).toHaveBeenCalledWith(
      mockCtx,
      mockTxPaymentReceived.id,
      { buyerDeliveryEmail: 'buyer@example.com' },
    );
    expect(result.buyerDeliveryEmail).toBe('buyer@example.com');
  });

  it('throws ForbiddenException when caller is not the buyer', async () => {
    transactionsRepository.findById.mockResolvedValue(mockTxPaymentReceived);

    await expect(
      service.setBuyerDeliveryEmail(
        mockCtx,
        mockTxPaymentReceived.id,
        'other_user',
        'buyer@example.com',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws BadRequestException when status is not PaymentReceived', async () => {
    const txWrongStatus = createMockTransaction({
      status: TransactionStatus.PendingPayment,
      buyerDeliveryEmail: null,
    });
    transactionsRepository.findById.mockResolvedValue(txWrongStatus);

    await expect(
      service.setBuyerDeliveryEmail(
        mockCtx,
        txWrongStatus.id,
        txWrongStatus.buyerId,
        'buyer@example.com',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws ConflictException when email already set', async () => {
    const txAlreadySet = createMockTransaction({
      status: TransactionStatus.PaymentReceived,
      buyerDeliveryEmail: 'existing@example.com',
    });
    transactionsRepository.findById.mockResolvedValue(txAlreadySet);

    await expect(
      service.setBuyerDeliveryEmail(
        mockCtx,
        txAlreadySet.id,
        txAlreadySet.buyerId,
        'new@example.com',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('throws NotFoundException when transaction not found', async () => {
    transactionsRepository.findById.mockResolvedValue(undefined);

    await expect(
      service.setBuyerDeliveryEmail(mockCtx, 'nonexistent', 'buyer_123', 'buyer@example.com'),
    ).rejects.toThrow(NotFoundException);
  });
});
```

Also add `ConflictException` to the imports at the top of the spec file if not already present:
```ts
import { NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
```

And add `buyerDeliveryEmail: null` to `createMockTransaction`'s default object (around line 52):
```ts
buyerDeliveryEmail: null,
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd backend
npm test -- --testPathPattern="transactions.service.spec" --no-coverage
```

Expected: new tests fail with "service.setBuyerDeliveryEmail is not a function" or similar.

- [ ] **Step 4: Implement service method**

In `backend/src/modules/transactions/transactions.service.ts`, add after `getTransactionById` (around line 1168):

```ts
  /**
   * Set buyer delivery email (buyer only, PaymentReceived status, locked after first set).
   */
  async setBuyerDeliveryEmail(
    ctx: Ctx,
    transactionId: string,
    buyerId: string,
    email: string,
  ): Promise<TransactionWithDetails> {
    this.logger.debug(ctx, 'setBuyerDeliveryEmail', { transactionId, buyerId });

    const transaction = await this.transactionsRepository.findById(ctx, transactionId);
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    if (transaction.buyerId !== buyerId) {
      throw new ForbiddenException('Only the buyer can set the delivery email');
    }
    if (transaction.status !== TransactionStatus.PaymentReceived) {
      throw new BadRequestException(
        'Delivery email can only be set when status is PaymentReceived',
      );
    }
    if (transaction.buyerDeliveryEmail !== null) {
      throw new ConflictException('Delivery email has already been set');
    }

    const updated = await this.transactionsRepository.update(ctx, transactionId, {
      buyerDeliveryEmail: email,
    });
    if (!updated) {
      throw new NotFoundException('Transaction not found after update');
    }

    return this.enrichTransaction(ctx, updated);
  }
```

Make sure `ConflictException` is imported at the top of `transactions.service.ts`:
```ts
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, ... } from '@nestjs/common';
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd backend
npm test -- --testPathPattern="transactions.service.spec" --no-coverage
```

Expected: all new tests pass. Existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/modules/transactions/transactions.api.ts src/modules/transactions/transactions.service.ts test/unit/modules/transactions/transactions.service.spec.ts
git commit -m "feat: add setBuyerDeliveryEmail service method with tests"
```

---

### Task 4: Controller endpoint

**Files:**
- Modify: `backend/src/modules/transactions/transactions.controller.ts`

- [ ] **Step 1: Add imports**

In `transactions.controller.ts`, add to the existing NestJS imports:
```ts
import { SetBuyerDeliveryEmailSchema, SetBuyerDeliveryEmailResponse } from './transactions.api';
```

(Check if `Patch` decorator is already imported from `@nestjs/common`; add it if not.)

- [ ] **Step 2: Add endpoint**

After the `markChatAsRead` endpoint (search for `chat/read`), add:

```ts
  /**
   * Set buyer delivery email (buyer only, PaymentReceived, locked after first set).
   */
  @Patch(':id/buyer-delivery-email')
  @UseGuards(JwtAuthGuard)
  async setBuyerDeliveryEmail(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<ApiResponse<SetBuyerDeliveryEmailResponse>> {
    const { email } = SetBuyerDeliveryEmailSchema.parse(body);
    const transaction = await this.transactionsService.setBuyerDeliveryEmail(
      ctx,
      id,
      user.id,
      email,
    );
    return { success: true, data: transaction };
  }
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd backend
npx tsc --noEmit
```

Expected: zero new errors.

- [ ] **Step 4: Commit**

```bash
git add src/modules/transactions/transactions.controller.ts
git commit -m "feat: add PATCH buyer-delivery-email endpoint"
```

---

### Task 5: Frontend types + service method

**Files:**
- Modify: `frontend/src/api/types/transactions.ts`
- Modify: `frontend/src/api/services/transactions.service.ts`

- [ ] **Step 1: Add field to frontend Transaction type**

In `frontend/src/api/types/transactions.ts`, find `TransactionWithDetails` (around line 173) and add after `sellerPic`:

```ts
  buyerDeliveryEmail: string | null;
```

- [ ] **Step 2: Add service method**

In `frontend/src/api/services/transactions.service.ts`, add after `markTransactionChatAsRead`:

```ts
  async setBuyerDeliveryEmail(transactionId: string, email: string): Promise<TransactionWithDetails> {
    const response = await apiClient.patch<TransactionWithDetails>(
      `/transactions/${transactionId}/buyer-delivery-email`,
      { email },
    );
    return response.data;
  },
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend
npx tsc --noEmit
```

Expected: zero new errors (or only pre-existing ones).

- [ ] **Step 4: Commit**

```bash
git add src/api/types/transactions.ts src/api/services/transactions.service.ts
git commit -m "feat: add buyerDeliveryEmail type and service method"
```

---

### Task 6: BuyerDeliveryEmailCard component + i18n

**Files:**
- Create: `frontend/src/app/components/transaction/BuyerDeliveryEmailCard.tsx`
- Modify: `frontend/src/i18n/locales/en.json`
- Modify: `frontend/src/i18n/locales/es.json`

- [ ] **Step 1: Add i18n keys to en.json**

In `frontend/src/i18n/locales/en.json`, inside the `"transaction"` object, add a new `"deliveryEmail"` section. Find the `"transaction"` key and add:

```json
"deliveryEmail": {
  "cardTitle": "What email should we send your tickets to?",
  "hint": "You can use a different email if you want.",
  "confirmButton": "Confirm email",
  "lockedHint": "Cannot be changed",
  "saving": "Saving..."
}
```

Also update the existing key `"buyerPaymentReceivedSubtitle"` inside `"transaction" > "hero"` — keep it and add a new key next to it:

```json
"buyerPaymentReceivedNoEmailSubtitle": "Tell us what email to send your tickets to before the seller transfers."
```

Also inside `"myTicket"` add:
```json
"buyerDisclaimerEmail": "Delivery email: {{email}}"
```

- [ ] **Step 2: Add i18n keys to es.json**

In `frontend/src/i18n/locales/es.json`, mirror the same keys:

```json
"deliveryEmail": {
  "cardTitle": "¿A qué email te enviamos las entradas?",
  "hint": "Podés usar otro email si querés.",
  "confirmButton": "Confirmar email",
  "lockedHint": "No puede modificarse",
  "saving": "Guardando..."
}
```

Add to `"transaction" > "hero"`:
```json
"buyerPaymentReceivedNoEmailSubtitle": "Indicanos a qué email enviarte las entradas antes de que el vendedor transfiera."
```

Add to `"myTicket"`:
```json
"buyerDisclaimerEmail": "Email de entrega: {{email}}"
```

- [ ] **Step 3: Create BuyerDeliveryEmailCard component**

Create `frontend/src/app/components/transaction/BuyerDeliveryEmailCard.tsx`:

```tsx
import { useState } from 'react';
import { Check, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CARD, BORDER, DARK, MUTED, SUCCESS, SUCCESS_LIGHT, SUCCESS_BORDER, V, S, R_INPUT, R_CARD } from '@/lib/design-tokens';

interface BuyerDeliveryEmailCardProps {
  deliveryEmail: string | null;
  currentUserEmail: string;
  onConfirm: (email: string) => Promise<void>;
}

export function BuyerDeliveryEmailCard({
  deliveryEmail,
  currentUserEmail,
  onConfirm,
}: BuyerDeliveryEmailCardProps) {
  const { t } = useTranslation();
  const [inputEmail, setInputEmail] = useState(currentUserEmail);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputEmail.trim());

  const handleConfirm = async (): Promise<void> => {
    if (!isValidEmail || saving) return;
    setError(null);
    setSaving(true);
    try {
      await onConfirm(inputEmail.trim());
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Error al guardar el email';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (deliveryEmail !== null) {
    return (
      <div
        className="rounded-card border p-4 flex items-start gap-3"
        style={{ background: SUCCESS_LIGHT, borderColor: SUCCESS_BORDER, ...S }}
      >
        <Check className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: SUCCESS }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: SUCCESS }}>
            {deliveryEmail}
          </p>
          <p className="text-xs mt-0.5" style={{ color: MUTED }}>
            {t('transaction.deliveryEmail.lockedHint')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-card border p-4"
      style={{ background: CARD, borderColor: BORDER, ...S }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Mail className="h-4 w-4 flex-shrink-0" style={{ color: V }} />
        <h3 className="text-sm font-bold" style={{ color: DARK }}>
          {t('transaction.deliveryEmail.cardTitle')}
        </h3>
      </div>
      <div className="flex gap-2">
        <input
          type="email"
          value={inputEmail}
          onChange={(e) => setInputEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleConfirm();
          }}
          disabled={saving}
          className="flex-1 px-3 py-2 text-sm border focus:outline-none focus:ring-2 disabled:opacity-50"
          style={{
            borderRadius: R_INPUT,
            borderColor: BORDER,
            ...S,
          }}
        />
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={!isValidEmail || saving}
          className="px-4 py-2 rounded-button text-sm font-bold text-white flex-shrink-0 disabled:opacity-50"
          style={{ background: V }}
        >
          {saving ? t('transaction.deliveryEmail.saving') : t('transaction.deliveryEmail.confirmButton')}
        </button>
      </div>
      <p className="text-xs mt-2" style={{ color: MUTED }}>
        {t('transaction.deliveryEmail.hint')}
      </p>
      {error && <p className="text-xs mt-2 text-red-600">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd frontend
npx tsc --noEmit
```

Expected: zero new errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/components/transaction/BuyerDeliveryEmailCard.tsx src/i18n/locales/en.json src/i18n/locales/es.json
git commit -m "feat: add BuyerDeliveryEmailCard component and i18n keys"
```

---

### Task 7: Wire up BuyerActionBlock, SellerActionBlock, and MyTicket

**Files:**
- Modify: `frontend/src/app/components/transaction/types.ts`
- Modify: `frontend/src/app/components/transaction/BuyerActionBlock.tsx`
- Modify: `frontend/src/app/components/transaction/SellerActionBlock.tsx`
- Modify: `frontend/src/app/pages/MyTicket.tsx`

- [ ] **Step 1: Add props to BuyerActionBlockProps**

In `frontend/src/app/components/transaction/types.ts`, add to `BuyerActionBlockProps` (after `onPaymentExpired`):

```ts
  deliveryEmail: string | null;
  currentUserEmail: string;
  onConfirmDeliveryEmail: (email: string) => Promise<void>;
```

- [ ] **Step 2: Update BuyerActionBlock**

In `frontend/src/app/components/transaction/BuyerActionBlock.tsx`:

Add import at the top:
```ts
import { BuyerDeliveryEmailCard } from './BuyerDeliveryEmailCard';
```

Destructure the new props from `props`:
```ts
const {
  // ...existing props...
  deliveryEmail,
  currentUserEmail,
  onConfirmDeliveryEmail,
} = props;
```

Find the `PaymentReceived` block (around line 275):
```tsx
{effectiveStatus === TransactionStatus.PaymentReceived && (
  <ActionHero
    ...
    subtitle={t('transaction.hero.buyerPaymentReceivedSubtitle')}
  >
```

Replace with:
```tsx
{effectiveStatus === TransactionStatus.PaymentReceived && (
  <>
    <BuyerDeliveryEmailCard
      deliveryEmail={deliveryEmail}
      currentUserEmail={currentUserEmail}
      onConfirm={onConfirmDeliveryEmail}
    />
    <ActionHero
      variant="blue"
      icon={<SendHorizontal className="h-5 w-5" />}
      title={t('transaction.hero.buyerPaymentReceivedTitle')}
      subtitle={
        deliveryEmail === null
          ? t('transaction.hero.buyerPaymentReceivedNoEmailSubtitle')
          : t('transaction.hero.buyerPaymentReceivedSubtitle')
      }
    >
      <TransferTimeline role="buyer" effectiveStatus={effectiveStatus} />
      {canOpenDispute && (
        <button
          type="button"
          onClick={onOpenDispute}
          className="mt-4 w-full text-center text-xs font-semibold underline"
          style={{ color: MUTED }}
        >
          {t('myTicket.reportProblem')}
        </button>
      )}
    </ActionHero>
  </>
)}
```

- [ ] **Step 3: Update SellerActionBlock**

In `frontend/src/app/components/transaction/SellerActionBlock.tsx`, find the `PaymentReceived` buyer disclaimer box (around line 125):

```tsx
<div
  className="mb-4 space-y-1 rounded-card border p-3 text-sm"
  style={{ borderColor: ABORD, background: ABG }}
>
  <p className="font-semibold" style={{ color: AMBER }}>
    {t('myTicket.buyerDisclaimerTitle')}
  </p>
  <p style={{ color: DARK }}>{t('myTicket.buyerDisclaimerName', { name: transaction.buyerName })}</p>
</div>
```

Replace with:
```tsx
<div
  className="mb-4 space-y-1 rounded-card border p-3 text-sm"
  style={{ borderColor: ABORD, background: ABG }}
>
  <p className="font-semibold" style={{ color: AMBER }}>
    {t('myTicket.buyerDisclaimerTitle')}
  </p>
  <p style={{ color: DARK }}>{t('myTicket.buyerDisclaimerName', { name: transaction.buyerName })}</p>
  {transaction.buyerDeliveryEmail && (
    <p style={{ color: DARK }}>{t('myTicket.buyerDisclaimerEmail', { email: transaction.buyerDeliveryEmail })}</p>
  )}
</div>
```

- [ ] **Step 4: Wire up MyTicket.tsx**

In `frontend/src/app/pages/MyTicket.tsx`, find where `BuyerActionBlock` is rendered (around line 1389) and add the three new props:

```tsx
<BuyerActionBlock
  // ...existing props...
  deliveryEmail={transaction.buyerDeliveryEmail}
  currentUserEmail={user?.email ?? ''}
  onConfirmDeliveryEmail={async (email: string) => {
    const updated = await transactionsService.setBuyerDeliveryEmail(transaction.id, email);
    setTransaction(updated);
  }}
/>
```

Note: check how `setTransaction` is named in MyTicket — search for `setTransaction` or the state setter for `transaction`. Use whatever name is in use.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd frontend
npx tsc --noEmit
```

Expected: zero new errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/components/transaction/types.ts src/app/components/transaction/BuyerActionBlock.tsx src/app/components/transaction/SellerActionBlock.tsx src/app/pages/MyTicket.tsx
git commit -m "feat: wire buyer delivery email into transaction page"
```

---

## Self-Review

### Spec coverage
- ✅ `buyerDeliveryEmail` field: Task 1
- ✅ PATCH endpoint, buyer-only, locked: Tasks 3–4
- ✅ `BuyerDeliveryEmailCard` above ActionHero: Task 7 step 2
- ✅ Subtitle changes based on email state: Task 7 step 2
- ✅ Seller sees email in buyer disclaimer: Task 7 step 3
- ✅ Confirmed state (read-only, green, lock hint): Task 6 step 3
- ✅ i18n keys (all 7): Task 6 steps 1–2
- ✅ Unit tests (happy, forbidden, wrong status, conflict, not found): Task 3 step 2

### Type consistency
- `buyerDeliveryEmail: string | null` used consistently across domain, mapper, frontend type, component props
- `onConfirmDeliveryEmail` in `BuyerActionBlockProps` matches prop name used in `BuyerActionBlock`
- `transaction.buyerDeliveryEmail` accessed the same way in both `BuyerActionBlock` and `SellerActionBlock`

### Placeholder check
- No TBDs, no "add error handling", no "similar to previous" — all steps have concrete code
