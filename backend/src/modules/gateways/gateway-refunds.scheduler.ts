import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomBytes } from 'crypto';
import { ContextLogger } from '../../common/logger/context-logger';
import type { Ctx } from '../../common/types/context';
import { DistributedLockService } from '../../common/locks';
import { CronMetricsService } from '../../common/metrics/cron-metrics.service';
import { GatewayRefundsService } from './gateway-refunds.service';

const LOCK_ID = 'scheduler:gateway:process-refunds';
const LOCK_TTL_SECONDS = 55;

@Injectable()
export class GatewayRefundsScheduler {
  private readonly logger = new ContextLogger(GatewayRefundsScheduler.name);

  constructor(
    private readonly gatewayRefundsService: GatewayRefundsService,
    private readonly lockService: DistributedLockService,
    private readonly cronMetrics: CronMetricsService,
  ) {}

  /**
   * Process pending refunds every minute.
   * Failed refunds remain in 'Failed' status for manual review — no auto-retry.
   * Uses distributed lock to prevent duplicate processing across instances.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processPendingRefunds(): Promise<void> {
    await this.cronMetrics.run('gateway:processPendingRefunds', async () => {
      const ctx: Ctx = {
        source: 'CRON',
        requestId: `cron_${Date.now()}_${randomBytes(4).toString('hex')}`,
        scheduledJobName: 'gateway:processPendingRefunds',
      };

      const count = await this.lockService.withLockAndLog(
        ctx,
        LOCK_ID,
        LOCK_TTL_SECONDS,
        () => this.gatewayRefundsService.processPendingRefunds(ctx),
      );

      if (count !== null && count > 0) {
        this.logger.log(ctx, `Gateway refunds processed: ${count}`);
      }
    });
  }
}
