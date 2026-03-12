import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ContextLogger } from '../../common/logger/context-logger';
import { DistributedLockService } from '../../common/locks';
import { CronMetricsService } from '../../common/metrics/cron-metrics.service';
import type { Ctx } from '../../common/types/context';
import { NotificationsService } from './notifications.service';
import { NotificationsWorker } from './notifications.worker';

const SCHEDULER_CTX: Ctx = {
  source: 'CRON',
  requestId: 'notifications-scheduler',
};

const LOCK_IDS = {
  PROCESS_EVENTS: 'scheduler:notifications:process',
  SEND_EMAILS: 'scheduler:notifications:emails',
  RETRY_EMAILS: 'scheduler:notifications:retry',
  CLEANUP: 'scheduler:notifications:cleanup',
} as const;

const LOCK_TTL = {
  PROCESS_EVENTS: 30,
  SEND_EMAILS: 30,
  RETRY_EMAILS: 60,
  CLEANUP: 300,
} as const;

@Injectable()
export class NotificationsScheduler {
  private readonly logger = new ContextLogger(NotificationsScheduler.name);

  constructor(
    private readonly service: NotificationsService,
    private readonly worker: NotificationsWorker,
    private readonly lockService: DistributedLockService,
    private readonly cronMetrics: CronMetricsService,
  ) {}

  /**
   * Process pending notification events every 10 seconds.
   * Uses distributed lock to prevent duplicate processing.
   */
  @Cron('*/10 * * * * *')
  async processEvents(): Promise<void> {
    await this.cronMetrics.run('notifications_processEvents', async () => {
      const ctx: Ctx = {
        ...SCHEDULER_CTX,
        requestId: `notifications-process-${Date.now()}`,
        scheduledJobName: 'notifications_processEvents',
      };

      await this.lockService.withLockAndLog(
        ctx,
        LOCK_IDS.PROCESS_EVENTS,
        LOCK_TTL.PROCESS_EVENTS,
        async () => {
          try {
            await this.worker.processPendingEvents(ctx);
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(
              ctx,
              `Failed to process pending events: ${errorMessage}`,
            );
          }
        },
      );
    });
  }

  /**
   * Send pending email notifications every 15 seconds.
   * Uses distributed lock to prevent duplicate sending.
   */
  @Cron('*/15 * * * * *')
  async sendPendingEmails(): Promise<void> {
    await this.cronMetrics.run('notifications_sendPendingEmails', async () => {
      const ctx: Ctx = {
        ...SCHEDULER_CTX,
        requestId: `notifications-send-emails-${Date.now()}`,
        scheduledJobName: 'notifications_sendPendingEmails',
      };

      await this.lockService.withLockAndLog(
        ctx,
        LOCK_IDS.SEND_EMAILS,
        LOCK_TTL.SEND_EMAILS,
        async () => {
          try {
            await this.worker.sendPendingEmails(ctx);
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(
              ctx,
              `Failed to send pending emails: ${errorMessage}`,
            );
          }
        },
      );
    });
  }

  /**
   * Retry failed email notifications every minute.
   * Uses distributed lock to prevent duplicate retries.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async retryFailedEmails(): Promise<void> {
    await this.cronMetrics.run('notifications_retryFailedEmails', async () => {
      const ctx: Ctx = {
        ...SCHEDULER_CTX,
        requestId: `notifications-retry-${Date.now()}`,
        scheduledJobName: 'notifications_retryFailedEmails',
      };

      await this.lockService.withLockAndLog(
        ctx,
        LOCK_IDS.RETRY_EMAILS,
        LOCK_TTL.RETRY_EMAILS,
        async () => {
          try {
            await this.worker.retryFailedEmails(ctx);
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(ctx, `Failed to retry emails: ${errorMessage}`);
          }
        },
      );
    });
  }

  /**
   * Cleanup old notifications (30 days retention) - daily at 3am.
   * Uses distributed lock to prevent duplicate cleanup.
   */
  @Cron('0 0 3 * * *')
  async cleanupOldNotifications(): Promise<void> {
    await this.cronMetrics.run('notifications_cleanupOldNotifications', async () => {
      const ctx: Ctx = {
        ...SCHEDULER_CTX,
        requestId: `notifications-cleanup-${Date.now()}`,
        scheduledJobName: 'notifications_cleanupOldNotifications',
      };

      await this.lockService.withLockAndLog(
        ctx,
        LOCK_IDS.CLEANUP,
        LOCK_TTL.CLEANUP,
        async () => {
          try {
            const deletedCount = await this.service.cleanupOldNotifications(ctx);
            if (deletedCount > 0) {
              this.logger.log(
                ctx,
                `Cleaned up ${deletedCount} old notifications`,
              );
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(
              ctx,
              `Failed to cleanup old notifications: ${errorMessage}`,
            );
          }
        },
      );
    });
  }
}
