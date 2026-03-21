import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomBytes } from 'crypto';
import { ContextLogger } from '../../common/logger/context-logger';
import type { Ctx } from '../../common/types/context';
import { DistributedLockService } from '../../common/locks';
import { CronMetricsService } from '../../common/metrics/cron-metrics.service';
import { GatewayPaymentsService } from './gateway-payments.service';

const LOCK_ID = 'scheduler:gateway:poll-orders';
const LOCK_TTL_SECONDS = 55;

@Injectable()
export class GatewayPaymentsScheduler {
  private readonly logger = new ContextLogger(GatewayPaymentsScheduler.name);

  constructor(
    private readonly gatewayPaymentsService: GatewayPaymentsService,
    private readonly lockService: DistributedLockService,
    private readonly cronMetrics: CronMetricsService,
  ) {}

  /**
   * Poll pending gateway orders every minute.
   * Uses distributed lock to prevent duplicate processing across instances.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async pollPendingOrders(): Promise<void> {
    await this.cronMetrics.run('gateway:pollPendingOrders', async () => {
      const ctx: Ctx = {
        source: 'CRON',
        requestId: `cron_${Date.now()}_${randomBytes(4).toString('hex')}`,
        scheduledJobName: 'gateway:pollPendingOrders',
      };

      const count = await this.lockService.withLockAndLog(
        ctx,
        LOCK_ID,
        LOCK_TTL_SECONDS,
        () => this.gatewayPaymentsService.pollPendingOrders(ctx),
      );

      if (count !== null && count > 0) {
        this.logger.log(ctx, `Gateway orders polled: ${count}`);
      }
    });
  }
}
