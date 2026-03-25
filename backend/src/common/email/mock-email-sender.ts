import { ContextLogger } from '../logger/context-logger';
import type { OutboundMetricsService } from '../metrics/outbound-metrics.service';
import type { Ctx } from '../types/context';
import type { IEmailSender, SendEmailInput, SendEmailResult } from './email-sender.interface';

/**
 * Mock email sender. Logs what would be sent and returns a fake messageId. Used in non-production environments.
 */
export class MockEmailSender implements IEmailSender {
  private readonly logger = new ContextLogger(MockEmailSender.name);

  constructor(private readonly metrics?: OutboundMetricsService) {}

  async send(ctx: Ctx, input: SendEmailInput): Promise<SendEmailResult> {
    this.logger.log(
      ctx,
      `[MOCK_EMAIL] Would send email to=${input.to} subject="${input.subject}" body="${input.body.substring(0, 80)}${input.body.length > 80 ? '...' : ''}"`,
    );
    const mockMessageId = `mock_email_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    this.metrics?.recordEmailSend(true);
    return { success: true, messageId: mockMessageId };
  }
}
