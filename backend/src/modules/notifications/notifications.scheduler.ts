import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ContextLogger } from '../../common/logger/context-logger';
import type { Ctx } from '../../common/types/context';
import { NotificationsService } from './notifications.service';
import { NotificationsWorker } from './notifications.worker';

const SCHEDULER_CTX: Ctx = {
  source: 'CRON',
  requestId: 'notifications-scheduler',
};

@Injectable()
export class NotificationsScheduler {
  private readonly logger = new ContextLogger(NotificationsScheduler.name);

  constructor(
    private readonly service: NotificationsService,
    private readonly worker: NotificationsWorker,
  ) {}

  /**
   * Process pending notification events every 10 seconds
   */
  @Cron('*/10 * * * * *')
  async processEvents(): Promise<void> {
    const ctx: Ctx = {
      ...SCHEDULER_CTX,
      requestId: `notifications-process-${Date.now()}`,
    };

    try {
      await this.worker.processPendingEvents(ctx);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(ctx, `Failed to process pending events: ${errorMessage}`);
    }
  }

  /**
   * Send pending email notifications every 15 seconds
   */
  @Cron('*/15 * * * * *')
  async sendPendingEmails(): Promise<void> {
    const ctx: Ctx = {
      ...SCHEDULER_CTX,
      requestId: `notifications-send-emails-${Date.now()}`,
    };

    try {
      await this.worker.sendPendingEmails(ctx);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(ctx, `Failed to send pending emails: ${errorMessage}`);
    }
  }

  /**
   * Retry failed email notifications every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async retryFailedEmails(): Promise<void> {
    const ctx: Ctx = {
      ...SCHEDULER_CTX,
      requestId: `notifications-retry-${Date.now()}`,
    };

    try {
      await this.worker.retryFailedEmails(ctx);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(ctx, `Failed to retry emails: ${errorMessage}`);
    }
  }

  /**
   * Cleanup old notifications (30 days retention) - daily at 3am
   */
  @Cron('0 0 3 * * *')
  async cleanupOldNotifications(): Promise<void> {
    const ctx: Ctx = {
      ...SCHEDULER_CTX,
      requestId: `notifications-cleanup-${Date.now()}`,
    };

    try {
      const deletedCount = await this.service.cleanupOldNotifications(ctx);
      if (deletedCount > 0) {
        this.logger.log(ctx, `Cleaned up ${deletedCount} old notifications`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(ctx, `Failed to cleanup old notifications: ${errorMessage}`);
    }
  }
}
