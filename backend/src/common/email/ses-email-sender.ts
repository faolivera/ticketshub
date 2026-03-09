import {
  SESClient,
  SendEmailCommand,
  type SendEmailCommandInput,
} from '@aws-sdk/client-ses';
import { ContextLogger } from '../logger/context-logger';
import type { Ctx } from '../types/context';
import type { IEmailSender, SendEmailInput, SendEmailResult } from './email-sender.interface';

export interface SesEmailSenderConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  fromEmail: string;
}

/**
 * Email sender using AWS SES. Uses the same AWS credentials as storage (AWS_ACCESS_KEY_ID, AWS_REGION, AWS_SECRET_ACCESS_KEY).
 */
export class SesEmailSender implements IEmailSender {
  private readonly logger = new ContextLogger(SesEmailSender.name);
  private readonly client: SESClient;
  private readonly fromEmail: string;

  constructor(config: SesEmailSenderConfig) {
    this.fromEmail = config.fromEmail;
    this.client = new SESClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async send(ctx: Ctx, input: SendEmailInput): Promise<SendEmailResult> {
    this.logger.debug(ctx, 'send', { to: input.to, subject: input.subject });

    try {
      const message: SendEmailCommandInput['Message'] = {
        Subject: { Data: input.subject, Charset: 'UTF-8' },
        Body: {
          ...(input.htmlBody
            ? { Html: { Data: input.htmlBody, Charset: 'UTF-8' } }
            : {}),
          Text: { Data: input.body, Charset: 'UTF-8' },
        },
      };

      const command = new SendEmailCommand({
        Source: this.fromEmail,
        Destination: { ToAddresses: [input.to] },
        Message: message,
      });

      const response = await this.client.send(command);
      const messageId = response.MessageId;

      this.logger.debug(ctx, 'send success', { messageId, to: input.to });

      return { success: true, messageId };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(ctx, 'SES send failed', error);
      return { success: false, error: errorMessage };
    }
  }
}
