import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomBytes } from 'crypto';
import type { Ctx } from '../../common/types/context';
import { ContextLogger } from '../../common/logger/context-logger';
import { DistributedLockService } from '../../common/locks';
import { CronMetricsService } from '../../common/metrics/cron-metrics.service';
import { EventScoringRepository } from './event-scoring.repository';
import { EventScoringService } from './event-scoring.service';

const LOCK_ID = 'scheduler:event-scoring:run';
const LOCK_TTL_SECONDS = 300;

@Injectable()
export class EventScoringScheduler {
  private readonly logger = new ContextLogger(EventScoringScheduler.name);

  constructor(
    private readonly eventScoringService: EventScoringService,
    private readonly eventScoringRepository: EventScoringRepository,
    private readonly lockService: DistributedLockService,
    private readonly cronMetrics: CronMetricsService,
  ) {}

  /**
   * Tick every minute. Only run the actual job when config's jobIntervalMinutes has passed since lastRunAt.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async runScoringTick(): Promise<void> {
    await this.cronMetrics.run('eventScoring_runScoringTick', async () => {
      const ctx: Ctx = {
        source: 'CRON',
        requestId: `event-scoring-${Date.now()}-${randomBytes(4).toString('hex')}`,
        scheduledJobName: 'eventScoring_runScoringTick',
      };

      const acquired = await this.lockService.acquireLock(
        LOCK_ID,
        this.lockService.getHolderIdentifier(),
        LOCK_TTL_SECONDS,
      );
      if (!acquired) {
        return;
      }

      try {
        const config = await this.eventScoringRepository.getConfig(ctx);
        if (!config) return;

        const now = new Date();
        const lastRun = config.lastRunAt?.getTime() ?? 0;
        const intervalMs = config.jobIntervalMinutes * 60 * 1000;
        if (lastRun + intervalMs > now.getTime()) {
          return;
        }

        const result = await this.eventScoringService.runScoringJob(ctx);
        if (result.processed > 0) {
          this.logger.log(ctx, `Event scoring job processed ${result.processed} events`);
        }
      } catch (error) {
        this.logger.error(
          ctx,
          'Event scoring job failed',
          error instanceof Error ? error : new Error(String(error)),
        );
      } finally {
        await this.lockService.releaseLock(LOCK_ID, this.lockService.getHolderIdentifier());
      }
    });
  }
}
