import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomBytes } from 'crypto';
import { OffersService } from './offers.service';
import { DistributedLockService } from '../../common/locks';
import { CronMetricsService } from '../../common/metrics/cron-metrics.service';
import { ContextLogger } from '../../common/logger/context-logger';
import type { Ctx } from '../../common/types/context';

const LOCK_ID = 'scheduler:offers:expire';
const LOCK_TTL_SECONDS = 60;
const BATCH_LIMIT = 200;

@Injectable()
export class OffersScheduler {
  private readonly logger = new ContextLogger(OffersScheduler.name);

  constructor(
    private readonly offersService: OffersService,
    private readonly lockService: DistributedLockService,
    private readonly cronMetrics: CronMetricsService,
  ) {}

  /**
   * Expire stale offers every 5 minutes.
   * - pending past expiresAt         → expired / seller_no_response
   * - accepted past acceptedExpiresAt → expired / buyer_no_purchase
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpiredOffers(): Promise<void> {
    await this.cronMetrics.run('handleExpiredOffers', async () => {
      const ctx: Ctx = {
        source: 'CRON',
        requestId: `cron_${Date.now()}_${randomBytes(4).toString('hex')}`,
        scheduledJobName: 'handleExpiredOffers',
      };

      const result = await this.lockService.withLockAndLog(
        ctx,
        LOCK_ID,
        LOCK_TTL_SECONDS,
        () => this.offersService.expireStaleOffers(ctx, BATCH_LIMIT),
      );

      if (result && (result.expiredPending > 0 || result.expiredAccepted > 0)) {
        this.logger.log(
          ctx,
          `Expired offers: ${result.expiredPending} pending (seller_no_response), ${result.expiredAccepted} accepted (buyer_no_purchase)`,
        );
      }
    });
  }
}
