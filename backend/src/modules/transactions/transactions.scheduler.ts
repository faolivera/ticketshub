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
