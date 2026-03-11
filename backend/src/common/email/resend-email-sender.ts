import { Resend } from 'resend';
import { ContextLogger } from '../logger/context-logger';
import type { Ctx } from '../types/context';
import type {
  IEmailSender,
  SendEmailInput,
  SendEmailResult,
} from './email-sender.interface';

export interface ResendEmailSenderConfig {
  apiKey: string;
  fromEmail: string;
}

/**
 * Email sender using Resend (https://resend.com). Requires RESEND_API_KEY and a verified from domain.
 */
export class ResendEmailSender implements IEmailSender {
  private readonly logger = new ContextLogger(ResendEmailSender.name);
  private readonly resend: Resend;
  private readonly fromEmail: string;

  constructor(config: ResendEmailSenderConfig) {
    this.fromEmail = config.fromEmail;
    this.resend = new Resend(config.apiKey);
  }

  async send(ctx: Ctx, input: SendEmailInput): Promise<SendEmailResult> {
    this.logger.debug(ctx, 'send', { to: input.to, subject: input.subject });

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: input.to,
        subject: input.subject,
        html: input.htmlBody ?? input.body,
        text: input.body,
      });

      if (error) {
        const errorMessage =
          error?.message ?? (typeof error === 'string' ? error : String(error));
        this.logger.error(ctx, 'Resend send failed', error);
        return { success: false, error: errorMessage };
      }

      const messageId = data?.id;
      this.logger.debug(ctx, 'send success', { messageId, to: input.to });
      return { success: true, messageId };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(ctx, 'Resend send failed', error);
      return { success: false, error: errorMessage };
    }
  }
}
