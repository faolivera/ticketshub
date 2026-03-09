import type { Ctx } from '../types/context';

/**
 * Input for sending a single email
 */
export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
  /** Optional HTML body; if not set, body is used as text */
  htmlBody?: string;
}

/**
 * Result of sending an email
 */
export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Abstraction for sending email (SES, mock, etc.)
 */
export interface IEmailSender {
  send(ctx: Ctx, input: SendEmailInput): Promise<SendEmailResult>;
}

export const EMAIL_SENDER = Symbol('IEmailSender');
