import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomBytes } from 'crypto';
import { TransactionsService } from './transactions.service';
import { DistributedLockService } from '../../common/locks';
import { ContextLogger } from '../../common/logger/context-logger';
import type { Ctx } from '../../common/types/context';

const LOCK_ID_EXPIRED_TRANSACTIONS = 'scheduler:transactions:expired';
const LOCK_ID_DEPOSIT_RELEASES = 'scheduler:transactions:deposit-releases';
const LOCK_TTL_SECONDS = 60;

@Injectable()
export class TransactionsScheduler {
  private readonly logger = new ContextLogger(TransactionsScheduler.name);

  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly lockService: DistributedLockService,
  ) {}

  /**
   * Generate a unique request ID for cron context
   */
  private generateRequestId(): string {
    return `cron_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }

  /**
   * Process expired transactions every 30 seconds.
   * Uses distributed lock to prevent duplicate processing across multiple instances.
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleExpiredTransactions(): Promise<void> {
    const ctx: Ctx = {
      source: 'CRON',
      requestId: this.generateRequestId(),
    };

    const result = await this.lockService.withLockAndLog(
      ctx,
      LOCK_ID_EXPIRED_TRANSACTIONS,
      LOCK_TTL_SECONDS,
      async () => {
        // Cancel expired pending payments (10-minute timeout)
        const expiredPayments =
          await this.transactionsService.cancelExpiredPendingPayments(ctx);

        // Cancel expired admin reviews (24-hour timeout)
        const expiredReviews =
          await this.transactionsService.cancelExpiredAdminReviews(ctx);

        return { expiredPayments, expiredReviews };
      },
    );

    if (result === null) {
      return;
    }

    try {
      const { expiredPayments, expiredReviews } = result;
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

  /**
   * Transition to TransferringFund when depositReleaseAt has passed.
   * Runs every 5 minutes with distributed lock.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleDepositReleases(): Promise<void> {
    const ctx: Ctx = {
      source: 'CRON',
      requestId: this.generateRequestId(),
    };

    const count = await this.lockService.withLockAndLog(
      ctx,
      LOCK_ID_DEPOSIT_RELEASES,
      LOCK_TTL_SECONDS,
      async () => this.transactionsService.processDepositReleases(ctx),
    );

    if (count !== null && count > 0) {
      this.logger.log(ctx, `Deposit releases processed: ${count} transactions -> TransferringFund`);
    }
  }
}
