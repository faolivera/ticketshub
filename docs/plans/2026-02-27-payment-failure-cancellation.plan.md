# Payment Failure & Transaction Cancellation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement automatic transaction cancellation when payments fail, timeout, or are rejected, restoring tickets to availability.

**Architecture:** Cron-based scheduler (30-second interval) to detect expired transactions. New domain fields track cancellation metadata. ConfigService provides configurable timeout values.

**Tech Stack:** NestJS, @nestjs/schedule, TypeScript, React, TailwindCSS

---

## Task 1: Add @nestjs/schedule Package

**Files:**
- Modify: `backend/package.json`

**Step 1: Install the package**

Run:
```bash
cd backend && npm install @nestjs/schedule
```
Expected: Package added to dependencies

**Step 2: Verify installation**

Run:
```bash
cd backend && npm ls @nestjs/schedule
```
Expected: Shows @nestjs/schedule version

**Step 3: Commit**

```bash
git add backend/package.json backend/package-lock.json
git commit -m "chore: add @nestjs/schedule for cron jobs"
```

---

## Task 2: Add Domain Types (CancellationReason, Transaction Fields)

**Files:**
- Modify: `backend/src/modules/transactions/transactions.domain.ts`

**Step 1: Add CancellationReason enum**

Add after the `RequiredActor` enum:

```typescript
/**
 * Reason why a transaction was cancelled
 */
export enum CancellationReason {
  /** Buyer manually cancelled the transaction */
  BuyerCancelled = 'BuyerCancelled',
  /** Payment gateway returned a failure */
  PaymentFailed = 'PaymentFailed',
  /** Payment window (10 min) expired */
  PaymentTimeout = 'PaymentTimeout',
  /** Admin rejected the payment confirmation */
  AdminRejected = 'AdminRejected',
  /** Admin did not review within 24 hours */
  AdminReviewTimeout = 'AdminReviewTimeout',
}
```

**Step 2: Add new fields to Transaction interface**

Add these fields to the `Transaction` interface (after `cancelledAt?: Date;`):

```typescript
  /** Who cancelled the transaction */
  cancelledBy?: RequiredActor;

  /** Why the transaction was cancelled */
  cancellationReason?: CancellationReason;

  /** When the payment window expires (createdAt + 10 min) */
  paymentExpiresAt: Date;

  /** When admin review expires (set when confirmation uploaded, +24h) */
  adminReviewExpiresAt?: Date;
```

**Step 3: Verify TypeScript compiles**

Run:
```bash
cd backend && npx tsc --noEmit
```
Expected: Compilation errors (Transaction creation sites need new required field)

**Step 4: Commit**

```bash
git add backend/src/modules/transactions/transactions.domain.ts
git commit -m "feat(transactions): add CancellationReason enum and cancellation fields"
```

---

## Task 3: Add Config Values for Timeouts

**Files:**
- Modify: `backend/src/modules/config/config.domain.ts`
- Modify: `backend/src/modules/config/config.service.ts`

**Step 1: Add config fields to PlatformConfig interface**

In `config.domain.ts`, add to `PlatformConfig` interface:

```typescript
  /**
   * Minutes before payment expires (transaction auto-cancels)
   */
  paymentTimeoutMinutes: number;

  /**
   * Hours before admin review expires (transaction auto-cancels)
   */
  adminReviewTimeoutHours: number;
```

**Step 2: Add default values**

In `config.domain.ts`, add to `DEFAULT_PLATFORM_CONFIG`:

```typescript
  paymentTimeoutMinutes: 10,
  adminReviewTimeoutHours: 24,
```

**Step 3: Add getter methods to ConfigService**

In `config.service.ts`, add:

```typescript
  /**
   * Get payment timeout in minutes
   */
  getPaymentTimeoutMinutes(): number {
    return this.config.paymentTimeoutMinutes;
  }

  /**
   * Get admin review timeout in hours
   */
  getAdminReviewTimeoutHours(): number {
    return this.config.adminReviewTimeoutHours;
  }
```

**Step 4: Verify TypeScript compiles**

Run:
```bash
cd backend && npx tsc --noEmit
```
Expected: No new errors from config changes

**Step 5: Commit**

```bash
git add backend/src/modules/config/config.domain.ts backend/src/modules/config/config.service.ts
git commit -m "feat(config): add payment and admin review timeout settings"
```

---

## Task 4: Update TransactionsRepository

**Files:**
- Modify: `backend/src/modules/transactions/transactions.repository.ts`

**Step 1: Add method to find expired pending payments**

Add method:

```typescript
  /**
   * Find transactions with expired payment window
   */
  async findExpiredPendingPayments(ctx: Ctx): Promise<Transaction[]> {
    this.logger.log(ctx, 'Finding expired pending payments');
    const now = new Date();
    return this.transactions.filter(
      (t) =>
        t.status === TransactionStatus.PendingPayment &&
        t.paymentExpiresAt &&
        new Date(t.paymentExpiresAt) < now,
    );
  }
```

**Step 2: Add method to find expired admin reviews**

Add method:

```typescript
  /**
   * Find transactions with expired admin review window
   */
  async findExpiredAdminReviews(ctx: Ctx): Promise<Transaction[]> {
    this.logger.log(ctx, 'Finding expired admin reviews');
    const now = new Date();
    return this.transactions.filter(
      (t) =>
        t.status === TransactionStatus.PaymentPendingVerification &&
        t.adminReviewExpiresAt &&
        new Date(t.adminReviewExpiresAt) < now,
    );
  }
```

**Step 3: Verify TypeScript compiles**

Run:
```bash
cd backend && npx tsc --noEmit
```
Expected: Compiles (or existing errors only)

**Step 4: Commit**

```bash
git add backend/src/modules/transactions/transactions.repository.ts
git commit -m "feat(transactions): add repository methods for expired transactions"
```

---

## Task 5: Update TransactionsService - Cancel Method Signature

**Files:**
- Modify: `backend/src/modules/transactions/transactions.service.ts`

**Step 1: Update cancelTransaction method signature and implementation**

Replace the existing `cancelTransaction` method with:

```typescript
  /**
   * Cancel transaction and restore tickets
   */
  async cancelTransaction(
    ctx: Ctx,
    transactionId: string,
    cancelledBy: RequiredActor,
    cancellationReason: CancellationReason,
  ): Promise<Transaction> {
    const transaction = await this.transactionsRepository.findById(
      ctx,
      transactionId,
    );
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const cancellableStatuses = [
      TransactionStatus.PendingPayment,
      TransactionStatus.PaymentPendingVerification,
    ];
    if (!cancellableStatuses.includes(transaction.status)) {
      throw new BadRequestException(
        'Transaction cannot be cancelled in current status',
      );
    }

    // Restore tickets to listing
    await this.ticketsService.restoreTickets(
      ctx,
      transaction.listingId,
      transaction.ticketUnitIds,
    );

    const newStatus = TransactionStatus.Cancelled;
    const updated = await this.transactionsRepository.update(
      ctx,
      transactionId,
      {
        status: newStatus,
        requiredActor: STATUS_REQUIRED_ACTOR[newStatus],
        cancelledAt: new Date(),
        cancelledBy,
        cancellationReason,
      },
    );

    if (!updated) {
      throw new NotFoundException('Transaction not found');
    }

    this.logger.log(
      ctx,
      `Transaction ${transactionId} cancelled by ${cancelledBy}: ${cancellationReason}`,
    );
    return updated;
  }
```

**Step 2: Add CancellationReason import**

At the top of the file, update the imports from `./transactions.domain`:

```typescript
import {
  TransactionStatus,
  RequiredActor,
  STATUS_REQUIRED_ACTOR,
  CancellationReason,
} from './transactions.domain';
```

**Step 3: Verify TypeScript compiles**

Run:
```bash
cd backend && npx tsc --noEmit
```
Expected: Errors in controller (calling with old signature)

**Step 4: Commit**

```bash
git add backend/src/modules/transactions/transactions.service.ts
git commit -m "feat(transactions): update cancelTransaction to accept actor and reason"
```

---

## Task 6: Update TransactionsService - initiatePurchase

**Files:**
- Modify: `backend/src/modules/transactions/transactions.service.ts`

**Step 1: Set paymentExpiresAt when creating transaction**

In the `initiatePurchase` method, after the line that sets `createdAt: new Date()`, add:

Find this block:
```typescript
    const transaction: Transaction = {
      id: transactionId,
      // ... other fields ...
      createdAt: new Date(),
      updatedAt: new Date(),
```

Add `paymentExpiresAt` after `createdAt`:

```typescript
      createdAt: new Date(),
      paymentExpiresAt: new Date(
        Date.now() + this.configService.getPaymentTimeoutMinutes() * 60 * 1000,
      ),
      updatedAt: new Date(),
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
cd backend && npx tsc --noEmit
```
Expected: Fewer errors (paymentExpiresAt now set)

**Step 3: Commit**

```bash
git add backend/src/modules/transactions/transactions.service.ts
git commit -m "feat(transactions): set paymentExpiresAt in initiatePurchase"
```

---

## Task 7: Update TransactionsService - handlePaymentConfirmationUploaded

**Files:**
- Modify: `backend/src/modules/transactions/transactions.service.ts`

**Step 1: Set adminReviewExpiresAt when confirmation is uploaded**

In the `handlePaymentConfirmationUploaded` method, update the `transactionsRepository.update` call to include `adminReviewExpiresAt`:

Find:
```typescript
    const updated = await this.transactionsRepository.update(
      ctx,
      transactionId,
      {
        status: newStatus,
        requiredActor: STATUS_REQUIRED_ACTOR[newStatus],
      },
    );
```

Replace with:
```typescript
    const adminReviewExpiresAt = new Date(
      Date.now() + this.configService.getAdminReviewTimeoutHours() * 60 * 60 * 1000,
    );
    const updated = await this.transactionsRepository.update(
      ctx,
      transactionId,
      {
        status: newStatus,
        requiredActor: STATUS_REQUIRED_ACTOR[newStatus],
        adminReviewExpiresAt,
      },
    );
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
cd backend && npx tsc --noEmit
```
Expected: Compiles

**Step 3: Commit**

```bash
git add backend/src/modules/transactions/transactions.service.ts
git commit -m "feat(transactions): set adminReviewExpiresAt when confirmation uploaded"
```

---

## Task 8: Update TransactionsService - Add Expiration Methods

**Files:**
- Modify: `backend/src/modules/transactions/transactions.service.ts`

**Step 1: Add cancelExpiredPendingPayments method**

Add after the `cancelTransaction` method:

```typescript
  /**
   * Cancel all transactions with expired payment window (called by scheduler)
   */
  async cancelExpiredPendingPayments(ctx: Ctx): Promise<number> {
    this.logger.log(ctx, 'Cancelling expired pending payments');

    const expired =
      await this.transactionsRepository.findExpiredPendingPayments(ctx);
    let cancelled = 0;

    for (const transaction of expired) {
      try {
        await this.cancelTransaction(
          ctx,
          transaction.id,
          RequiredActor.Platform,
          CancellationReason.PaymentTimeout,
        );
        cancelled++;
      } catch (error) {
        this.logger.error(
          ctx,
          `Failed to cancel expired transaction ${transaction.id}: ${error}`,
        );
      }
    }

    if (cancelled > 0) {
      this.logger.log(ctx, `Cancelled ${cancelled} expired pending payments`);
    }
    return cancelled;
  }
```

**Step 2: Add cancelExpiredAdminReviews method**

Add after the previous method:

```typescript
  /**
   * Cancel all transactions with expired admin review window (called by scheduler)
   */
  async cancelExpiredAdminReviews(ctx: Ctx): Promise<number> {
    this.logger.log(ctx, 'Cancelling expired admin reviews');

    const expired =
      await this.transactionsRepository.findExpiredAdminReviews(ctx);
    let cancelled = 0;

    for (const transaction of expired) {
      try {
        await this.cancelTransaction(
          ctx,
          transaction.id,
          RequiredActor.Platform,
          CancellationReason.AdminReviewTimeout,
        );
        cancelled++;
      } catch (error) {
        this.logger.error(
          ctx,
          `Failed to cancel expired admin review ${transaction.id}: ${error}`,
        );
      }
    }

    if (cancelled > 0) {
      this.logger.log(ctx, `Cancelled ${cancelled} expired admin reviews`);
    }
    return cancelled;
  }
```

**Step 3: Verify TypeScript compiles**

Run:
```bash
cd backend && npx tsc --noEmit
```
Expected: Compiles

**Step 4: Commit**

```bash
git add backend/src/modules/transactions/transactions.service.ts
git commit -m "feat(transactions): add methods to cancel expired transactions"
```

---

## Task 9: Update TransactionsService - handlePaymentFailed

**Files:**
- Modify: `backend/src/modules/transactions/transactions.service.ts`

**Step 1: Add handlePaymentFailed method**

Add after the `handlePaymentReceived` method:

```typescript
  /**
   * Handle payment failure from gateway webhook
   */
  async handlePaymentFailed(ctx: Ctx, transactionId: string): Promise<Transaction> {
    this.logger.log(ctx, `Payment failed for transaction ${transactionId}`);

    const transaction = await this.transactionsRepository.findById(
      ctx,
      transactionId,
    );
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.status !== TransactionStatus.PendingPayment) {
      throw new BadRequestException('Invalid transaction status for payment failure');
    }

    return this.cancelTransaction(
      ctx,
      transactionId,
      RequiredActor.Platform,
      CancellationReason.PaymentFailed,
    );
  }
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
cd backend && npx tsc --noEmit
```
Expected: Compiles

**Step 3: Commit**

```bash
git add backend/src/modules/transactions/transactions.service.ts
git commit -m "feat(transactions): add handlePaymentFailed method"
```

---

## Task 10: Update approveManualPayment for Rejection

**Files:**
- Modify: `backend/src/modules/transactions/transactions.service.ts`

**Step 1: Update rejection case in approveManualPayment**

Find the `else` block in `approveManualPayment` (the rejection case):

```typescript
    } else {
      // Restore tickets to listing
      await this.ticketsService.restoreTickets(
        ctx,
        transaction.listingId,
        transaction.ticketUnitIds,
      );

      const newStatus = TransactionStatus.PendingPayment;
      const updated = await this.transactionsRepository.update(
```

Replace the entire `else` block with:

```typescript
    } else {
      // Admin rejected - cancel the transaction
      const updated = await this.cancelTransaction(
        ctx,
        transactionId,
        RequiredActor.Platform,
        CancellationReason.AdminRejected,
      );

      this.logger.log(
        ctx,
        `Transaction ${transactionId} - manual payment rejected: ${rejectionReason}`,
      );
      return updated;
    }
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
cd backend && npx tsc --noEmit
```
Expected: Compiles

**Step 3: Commit**

```bash
git add backend/src/modules/transactions/transactions.service.ts
git commit -m "feat(transactions): use cancelTransaction for admin rejection"
```

---

## Task 11: Update TransactionsController

**Files:**
- Modify: `backend/src/modules/transactions/transactions.controller.ts`

**Step 1: Update cancel endpoint to pass actor and reason**

Find the `cancelTransaction` method and update it:

```typescript
  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelTransaction(
    @Ctx() ctx: Ctx,
    @Param('id') id: string,
    @User() user: AuthenticatedUser,
  ): Promise<ApiResponse<{ cancelled: boolean }>> {
    // Verify user is the buyer
    const transaction = await this.transactionsService.findById(ctx, id);
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    if (transaction.buyerId !== user.id) {
      throw new ForbiddenException('Only buyer can cancel transaction');
    }

    await this.transactionsService.cancelTransaction(
      ctx,
      id,
      RequiredActor.Buyer,
      CancellationReason.BuyerCancelled,
    );
    return { success: true, data: { cancelled: true } };
  }
```

**Step 2: Add imports**

Add to the imports at the top:

```typescript
import { RequiredActor, CancellationReason } from './transactions.domain';
```

**Step 3: Verify TypeScript compiles**

Run:
```bash
cd backend && npx tsc --noEmit
```
Expected: Compiles

**Step 4: Commit**

```bash
git add backend/src/modules/transactions/transactions.controller.ts
git commit -m "feat(transactions): update controller cancel to use new signature"
```

---

## Task 12: Create TransactionsScheduler

**Files:**
- Create: `backend/src/modules/transactions/transactions.scheduler.ts`

**Step 1: Create the scheduler file**

Create file with content:

```typescript
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomBytes } from 'crypto';
import { TransactionsService } from './transactions.service';
import { ContextLogger } from '../../common/logger/context-logger';
import type { Ctx } from '../../common/types/context';

@Injectable()
export class TransactionsScheduler {
  private readonly logger = new ContextLogger(TransactionsScheduler.name);

  constructor(private readonly transactionsService: TransactionsService) {}

  /**
   * Generate a unique request ID for cron context
   */
  private generateRequestId(): string {
    return `cron_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }

  /**
   * Process expired transactions every 30 seconds
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleExpiredTransactions(): Promise<void> {
    const ctx: Ctx = {
      source: 'CRON',
      requestId: this.generateRequestId(),
    };

    try {
      // Cancel expired pending payments (10-minute timeout)
      const expiredPayments =
        await this.transactionsService.cancelExpiredPendingPayments(ctx);

      // Cancel expired admin reviews (24-hour timeout)
      const expiredReviews =
        await this.transactionsService.cancelExpiredAdminReviews(ctx);

      if (expiredPayments > 0 || expiredReviews > 0) {
        this.logger.log(
          ctx,
          `Expired transactions processed: ${expiredPayments} payments, ${expiredReviews} reviews`,
        );
      }
    } catch (error) {
      this.logger.error(ctx, `Error processing expired transactions: ${error}`);
    }
  }
}
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
cd backend && npx tsc --noEmit
```
Expected: Compiles

**Step 3: Commit**

```bash
git add backend/src/modules/transactions/transactions.scheduler.ts
git commit -m "feat(transactions): add scheduler for expired transaction cleanup"
```

---

## Task 13: Register Scheduler in Module

**Files:**
- Modify: `backend/src/modules/transactions/transactions.module.ts`

**Step 1: Add scheduler to providers**

Update the module:

```typescript
import { Module, forwardRef } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { TransactionsRepository } from './transactions.repository';
import { TransactionsScheduler } from './transactions.scheduler';
import { TicketsModule } from '../tickets/tickets.module';
import { PaymentsModule } from '../payments/payments.module';
import { WalletModule } from '../wallet/wallet.module';
import { UsersModule } from '../users/users.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    forwardRef(() => TicketsModule),
    PaymentsModule,
    WalletModule,
    UsersModule,
    forwardRef(() => EventsModule),
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService, TransactionsRepository, TransactionsScheduler],
  exports: [TransactionsService],
})
export class TransactionsModule {}
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
cd backend && npx tsc --noEmit
```
Expected: Compiles

**Step 3: Commit**

```bash
git add backend/src/modules/transactions/transactions.module.ts
git commit -m "feat(transactions): register scheduler in module"
```

---

## Task 14: Enable ScheduleModule in AppModule

**Files:**
- Modify: `backend/src/app.module.ts`

**Step 1: Import and add ScheduleModule**

Add import:
```typescript
import { ScheduleModule } from '@nestjs/schedule';
```

Add to imports array (after ServeStaticModule):
```typescript
    ScheduleModule.forRoot(),
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
cd backend && npx tsc --noEmit
```
Expected: Compiles

**Step 3: Verify backend starts**

Run:
```bash
cd backend && npm run start:dev
```
Expected: Server starts without errors, logs show scheduler registered

**Step 4: Commit**

```bash
git add backend/src/app.module.ts
git commit -m "feat: enable ScheduleModule for cron jobs"
```

---

## Task 15: Update Frontend Transaction Types

**Files:**
- Modify: `frontend/src/api/types/transactions.ts`

**Step 1: Add CancellationReason enum**

Add:

```typescript
export enum CancellationReason {
  BuyerCancelled = 'BuyerCancelled',
  PaymentFailed = 'PaymentFailed',
  PaymentTimeout = 'PaymentTimeout',
  AdminRejected = 'AdminRejected',
  AdminReviewTimeout = 'AdminReviewTimeout',
}
```

**Step 2: Add new fields to Transaction interface**

Add to the Transaction interface:

```typescript
  cancelledBy?: RequiredActor;
  cancellationReason?: CancellationReason;
  paymentExpiresAt: string;
  adminReviewExpiresAt?: string;
```

**Step 3: Verify TypeScript compiles**

Run:
```bash
cd frontend && npx tsc --noEmit
```
Expected: Compiles (or existing errors only)

**Step 4: Commit**

```bash
git add frontend/src/api/types/transactions.ts
git commit -m "feat(frontend): add cancellation fields to transaction types"
```

---

## Task 16: Add i18n Keys

**Files:**
- Modify: `frontend/src/i18n/locales/en.json`
- Modify: `frontend/src/i18n/locales/es.json`

**Step 1: Add English translations**

Add to the `transaction` section (or create if doesn't exist):

```json
  "transaction": {
    "timeRemaining": "Time remaining: {{time}}",
    "paymentExpired": "Payment time expired",
    "cancelButton": "Cancel Transaction",
    "cancelConfirm": "Are you sure you want to cancel this transaction? This action cannot be undone.",
    "cancelSuccess": "Transaction cancelled",
    "cancelled": {
      "BuyerCancelled": "You cancelled this transaction",
      "PaymentFailed": "Payment failed",
      "PaymentTimeout": "Payment time expired",
      "AdminRejected": "Payment confirmation was rejected",
      "AdminReviewTimeout": "Payment review timed out"
    }
  }
```

**Step 2: Add Spanish translations**

Add to the `transaction` section:

```json
  "transaction": {
    "timeRemaining": "Tiempo restante: {{time}}",
    "paymentExpired": "El tiempo de pago expiró",
    "cancelButton": "Cancelar Transacción",
    "cancelConfirm": "¿Estás seguro de que quieres cancelar esta transacción? Esta acción no se puede deshacer.",
    "cancelSuccess": "Transacción cancelada",
    "cancelled": {
      "BuyerCancelled": "Cancelaste esta transacción",
      "PaymentFailed": "El pago falló",
      "PaymentTimeout": "El tiempo de pago expiró",
      "AdminRejected": "La confirmación de pago fue rechazada",
      "AdminReviewTimeout": "La revisión de pago expiró"
    }
  }
```

**Step 3: Commit**

```bash
git add frontend/src/i18n/locales/en.json frontend/src/i18n/locales/es.json
git commit -m "feat(i18n): add transaction cancellation translations"
```

---

## Task 17: Create Countdown Timer Component

**Files:**
- Create: `frontend/src/app/components/PaymentCountdown.tsx`

**Step 1: Create the component**

```tsx
import { FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface PaymentCountdownProps {
  expiresAt: string;
  onExpired?: () => void;
  className?: string;
}

export const PaymentCountdown: FC<PaymentCountdownProps> = ({
  expiresAt,
  onExpired,
  className,
}) => {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = (): number => {
      const now = Date.now();
      const expires = new Date(expiresAt).getTime();
      return Math.max(0, Math.floor((expires - now) / 1000));
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);

      if (remaining <= 0 && !isExpired) {
        setIsExpired(true);
        onExpired?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpired, isExpired]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isExpired) {
    return (
      <div className={cn('text-red-600 font-medium', className)}>
        {t('transaction.paymentExpired')}
      </div>
    );
  }

  const isUrgent = timeLeft < 60;

  return (
    <div
      className={cn(
        'font-mono text-lg font-medium',
        isUrgent ? 'text-red-600 animate-pulse' : 'text-gray-700',
        className,
      )}
    >
      {t('transaction.timeRemaining', { time: formatTime(timeLeft) })}
    </div>
  );
};
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
cd frontend && npx tsc --noEmit
```
Expected: Compiles

**Step 3: Commit**

```bash
git add frontend/src/app/components/PaymentCountdown.tsx
git commit -m "feat(frontend): add PaymentCountdown component"
```

---

## Task 18: Create Cancel Transaction Hook

**Files:**
- Create: `frontend/src/api/hooks/useCancelTransaction.ts`

**Step 1: Create the hook**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsService } from '../services/transactions.service';

export const useCancelTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (transactionId: string) =>
      transactionsService.cancelTransaction(transactionId),
    onSuccess: (_, transactionId) => {
      queryClient.invalidateQueries({ queryKey: ['transaction', transactionId] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};
```

**Step 2: Check if transactionsService has cancelTransaction method**

If not present in `frontend/src/api/services/transactions.service.ts`, add:

```typescript
  async cancelTransaction(transactionId: string): Promise<{ cancelled: boolean }> {
    const response = await this.client.post<ApiResponse<{ cancelled: boolean }>>(
      `/transactions/${transactionId}/cancel`,
    );
    return response.data.data;
  }
```

**Step 3: Verify TypeScript compiles**

Run:
```bash
cd frontend && npx tsc --noEmit
```
Expected: Compiles

**Step 4: Commit**

```bash
git add frontend/src/api/hooks/useCancelTransaction.ts frontend/src/api/services/transactions.service.ts
git commit -m "feat(frontend): add cancel transaction hook and service method"
```

---

## Task 19: Update Transaction Detail Page - Add Timer and Cancel Button

**Files:**
- Modify: Transaction detail page (find the correct file)

**Step 1: Identify the transaction detail page**

Run:
```bash
cd frontend && grep -r "transactionId\|/transaction/" src/app/pages/ --include="*.tsx" -l
```
Expected: Find the transaction detail page file

**Step 2: Add countdown timer**

Import and add PaymentCountdown component when status is PendingPayment:

```tsx
import { PaymentCountdown } from '../components/PaymentCountdown';

// In the render, when status is PendingPayment:
{transaction.status === TransactionStatus.PendingPayment && (
  <PaymentCountdown
    expiresAt={transaction.paymentExpiresAt}
    onExpired={() => refetch()}
  />
)}
```

**Step 3: Add cancel button**

Add cancel button with confirmation dialog when buyer is viewing and status is PendingPayment:

```tsx
import { useCancelTransaction } from '@/api/hooks/useCancelTransaction';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// In component:
const cancelMutation = useCancelTransaction();

// In render, when user is buyer and status is PendingPayment:
{isBuyer && transaction.status === TransactionStatus.PendingPayment && (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="destructive" disabled={cancelMutation.isPending}>
        {t('transaction.cancelButton')}
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{t('transaction.cancelButton')}</AlertDialogTitle>
        <AlertDialogDescription>
          {t('transaction.cancelConfirm')}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
        <AlertDialogAction
          onClick={() => cancelMutation.mutate(transaction.id)}
        >
          {t('common.confirm')}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)}
```

**Step 4: Add cancellation reason display**

When status is Cancelled, show the reason:

```tsx
{transaction.status === TransactionStatus.Cancelled && transaction.cancellationReason && (
  <div className="text-red-600 font-medium">
    {t(`transaction.cancelled.${transaction.cancellationReason}`)}
  </div>
)}
```

**Step 5: Verify TypeScript compiles**

Run:
```bash
cd frontend && npx tsc --noEmit
```
Expected: Compiles

**Step 6: Commit**

```bash
git add frontend/src/app/pages/
git commit -m "feat(frontend): add countdown timer, cancel button, and cancellation display"
```

---

## Task 20: Create Unit Tests for TransactionsService

**Files:**
- Create: `backend/src/test/unit/modules/transactions/transactions.service.spec.ts`

**Step 1: Create test directory**

Run:
```bash
mkdir -p backend/src/test/unit/modules/transactions
```

**Step 2: Create test file with basic structure**

Create comprehensive tests for the new methods:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TransactionsService } from '../../../../modules/transactions/transactions.service';
import { TransactionsRepository } from '../../../../modules/transactions/transactions.repository';
import { TicketsService } from '../../../../modules/tickets/tickets.service';
import { PaymentsService } from '../../../../modules/payments/payments.service';
import { WalletService } from '../../../../modules/wallet/wallet.service';
import { ConfigService } from '../../../../modules/config/config.service';
import { UsersService } from '../../../../modules/users/users.service';
import { PaymentMethodsService } from '../../../../modules/payments/payment-methods.service';
import { PricingService } from '../../../../modules/payments/pricing/pricing.service';
import {
  TransactionStatus,
  RequiredActor,
  CancellationReason,
} from '../../../../modules/transactions/transactions.domain';
import type { Ctx } from '../../../../common/types/context';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let transactionsRepository: jest.Mocked<TransactionsRepository>;
  let ticketsService: jest.Mocked<TicketsService>;

  const mockCtx: Ctx = { source: 'HTTP', requestId: 'test-request-id' };

  const createMockTransaction = (overrides = {}) => ({
    id: 'txn_123',
    listingId: 'listing_123',
    buyerId: 'buyer_123',
    sellerId: 'seller_123',
    ticketUnitIds: ['unit_1', 'unit_2'],
    status: TransactionStatus.PendingPayment,
    paymentExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    const mockTransactionsRepository = {
      findById: jest.fn(),
      update: jest.fn(),
      findExpiredPendingPayments: jest.fn(),
      findExpiredAdminReviews: jest.fn(),
    };

    const mockTicketsService = {
      restoreTickets: jest.fn(),
    };

    const mockPaymentsService = {};
    const mockWalletService = {};
    const mockConfigService = {
      getPaymentTimeoutMinutes: jest.fn().mockReturnValue(10),
      getAdminReviewTimeoutHours: jest.fn().mockReturnValue(24),
      getDigitalNonTransferableReleaseMinutes: jest.fn().mockReturnValue(30),
    };
    const mockUsersService = {};
    const mockPaymentMethodsService = {};
    const mockPricingService = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: TransactionsRepository, useValue: mockTransactionsRepository },
        { provide: TicketsService, useValue: mockTicketsService },
        { provide: PaymentsService, useValue: mockPaymentsService },
        { provide: WalletService, useValue: mockWalletService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: PaymentMethodsService, useValue: mockPaymentMethodsService },
        { provide: PricingService, useValue: mockPricingService },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    transactionsRepository = module.get(TransactionsRepository);
    ticketsService = module.get(TicketsService);
  });

  describe('cancelTransaction', () => {
    it('should cancel a PendingPayment transaction', async () => {
      const transaction = createMockTransaction();
      transactionsRepository.findById.mockResolvedValue(transaction);
      transactionsRepository.update.mockResolvedValue({
        ...transaction,
        status: TransactionStatus.Cancelled,
        cancelledBy: RequiredActor.Buyer,
        cancellationReason: CancellationReason.BuyerCancelled,
      });
      ticketsService.restoreTickets.mockResolvedValue(undefined);

      const result = await service.cancelTransaction(
        mockCtx,
        'txn_123',
        RequiredActor.Buyer,
        CancellationReason.BuyerCancelled,
      );

      expect(result.status).toBe(TransactionStatus.Cancelled);
      expect(ticketsService.restoreTickets).toHaveBeenCalledWith(
        mockCtx,
        'listing_123',
        ['unit_1', 'unit_2'],
      );
    });

    it('should throw NotFoundException when transaction not found', async () => {
      transactionsRepository.findById.mockResolvedValue(null);

      await expect(
        service.cancelTransaction(
          mockCtx,
          'invalid_id',
          RequiredActor.Buyer,
          CancellationReason.BuyerCancelled,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when transaction is not cancellable', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.Completed,
      });
      transactionsRepository.findById.mockResolvedValue(transaction);

      await expect(
        service.cancelTransaction(
          mockCtx,
          'txn_123',
          RequiredActor.Buyer,
          CancellationReason.BuyerCancelled,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelExpiredPendingPayments', () => {
    it('should cancel all expired pending payments', async () => {
      const expiredTransactions = [
        createMockTransaction({ id: 'txn_1' }),
        createMockTransaction({ id: 'txn_2' }),
      ];
      transactionsRepository.findExpiredPendingPayments.mockResolvedValue(
        expiredTransactions,
      );
      transactionsRepository.findById.mockImplementation(async (_, id) =>
        expiredTransactions.find((t) => t.id === id),
      );
      transactionsRepository.update.mockImplementation(async (_, id) => ({
        ...expiredTransactions.find((t) => t.id === id),
        status: TransactionStatus.Cancelled,
      }));
      ticketsService.restoreTickets.mockResolvedValue(undefined);

      const result = await service.cancelExpiredPendingPayments(mockCtx);

      expect(result).toBe(2);
      expect(ticketsService.restoreTickets).toHaveBeenCalledTimes(2);
    });

    it('should return 0 when no expired transactions', async () => {
      transactionsRepository.findExpiredPendingPayments.mockResolvedValue([]);

      const result = await service.cancelExpiredPendingPayments(mockCtx);

      expect(result).toBe(0);
    });
  });

  describe('handlePaymentFailed', () => {
    it('should cancel transaction on payment failure', async () => {
      const transaction = createMockTransaction();
      transactionsRepository.findById.mockResolvedValue(transaction);
      transactionsRepository.update.mockResolvedValue({
        ...transaction,
        status: TransactionStatus.Cancelled,
        cancellationReason: CancellationReason.PaymentFailed,
      });
      ticketsService.restoreTickets.mockResolvedValue(undefined);

      const result = await service.handlePaymentFailed(mockCtx, 'txn_123');

      expect(result.status).toBe(TransactionStatus.Cancelled);
      expect(result.cancellationReason).toBe(CancellationReason.PaymentFailed);
    });
  });
});
```

**Step 3: Run tests**

Run:
```bash
cd backend && npm test -- --testPathPattern="transactions.service.spec"
```
Expected: Tests pass

**Step 4: Commit**

```bash
git add backend/src/test/unit/modules/transactions/
git commit -m "test(transactions): add unit tests for cancellation methods"
```

---

## Task 21: Test End-to-End Flow

**Step 1: Start the backend**

Run:
```bash
cd backend && npm run start:dev
```
Expected: Server starts, scheduler logs appear every 30 seconds

**Step 2: Create a test transaction and let it expire**

1. Create a transaction via the buy flow
2. Wait 10+ minutes
3. Verify transaction status changes to Cancelled
4. Verify tickets are restored to listing

**Step 3: Test buyer cancellation**

1. Create a transaction
2. As buyer, click cancel button
3. Verify confirmation dialog appears
4. Confirm cancellation
5. Verify transaction is cancelled

**Step 4: Commit final verification**

```bash
git add .
git commit -m "docs: verify payment failure and cancellation implementation"
```

---

## Summary

This implementation plan covers:

1. **Backend Domain**: CancellationReason enum, new Transaction fields
2. **Backend Config**: Configurable timeout values (10 min payment, 24h admin)
3. **Backend Service**: Updated cancelTransaction, new expiration methods
4. **Backend Scheduler**: Cron job running every 30 seconds
5. **Frontend Types**: Updated Transaction interface
6. **Frontend Components**: PaymentCountdown timer, cancel button
7. **Frontend i18n**: EN/ES translations
8. **Unit Tests**: Coverage for new service methods
