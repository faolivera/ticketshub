import { Injectable } from '@nestjs/common';
import { ContextLogger } from '../../common/logger/context-logger';
import type { Ctx } from '../../common/types/context';
import type {
  InAppNotification,
  EmailResult,
  SMSResult,
} from './notifications.domain';
import { EmailTemplate, InAppNotificationType } from './notifications.domain';

/**
 * Abstract notification service interface
 * In production, implement specific providers (SendGrid, Twilio, etc.)
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new ContextLogger(NotificationsService.name);

  /**
   * Send email notification
   * TODO: Integrate with email provider (SendGrid, SES, etc.)
   */
  async sendEmail(
    ctx: Ctx,
    to: string,
    template: EmailTemplate,
    data: Record<string, unknown>,
  ): Promise<EmailResult> {
    this.logger.log(
      ctx,
      `[MOCK] Sending email to ${to} with template ${template}`,
    );
    this.logger.debug(ctx, `Email data: ${JSON.stringify(data)}`);

    // Mock implementation - always succeeds
    return {
      success: true,
      messageId: `mock_email_${Date.now()}`,
    };
  }

  /**
   * Send SMS notification
   * TODO: Integrate with SMS provider (Twilio, etc.)
   */
  async sendSMS(ctx: Ctx, to: string, message: string): Promise<SMSResult> {
    this.logger.log(ctx, `[MOCK] Sending SMS to ${to}`);
    this.logger.debug(ctx, `SMS message: ${message}`);

    // Mock implementation - always succeeds
    return {
      success: true,
      messageId: `mock_sms_${Date.now()}`,
    };
  }

  /**
   * Send in-app notification
   * TODO: Implement with WebSocket or push notification system
   */
  async sendInApp(
    ctx: Ctx,
    userId: string,
    type: InAppNotificationType,
    title: string,
    message: string,
    actionUrl?: string,
  ): Promise<InAppNotification> {
    this.logger.log(
      ctx,
      `[MOCK] Sending in-app notification to user ${userId}`,
    );

    const notification: InAppNotification = {
      id: `notif_${Date.now()}`,
      userId,
      type,
      title,
      message,
      actionUrl,
      read: false,
      createdAt: new Date(),
    };

    // TODO: Store notification and emit via WebSocket

    return notification;
  }

  /**
   * Helper: Send OTP via email
   */
  async sendOTPEmail(
    ctx: Ctx,
    email: string,
    code: string,
  ): Promise<EmailResult> {
    return this.sendEmail(ctx, email, EmailTemplate.EmailVerification, {
      code,
      expiresInMinutes: 10,
    });
  }

  /**
   * Helper: Send OTP via SMS
   */
  async sendOTPSMS(ctx: Ctx, phone: string, code: string): Promise<SMSResult> {
    const message = `Your TicketsHub verification code is: ${code}. Valid for 10 minutes.`;
    return this.sendSMS(ctx, phone, message);
  }

  /**
   * Helper: Notify seller of payment received
   */
  async notifyPaymentReceived(
    ctx: Ctx,
    sellerEmail: string,
    buyerName: string,
    eventName: string,
    amount: string,
  ): Promise<EmailResult> {
    return this.sendEmail(ctx, sellerEmail, EmailTemplate.PaymentReceived, {
      buyerName,
      eventName,
      amount,
    });
  }

  /**
   * Helper: Notify buyer of ticket purchase
   */
  async notifyTicketPurchased(
    ctx: Ctx,
    buyerEmail: string,
    eventName: string,
    ticketDetails: string,
  ): Promise<EmailResult> {
    return this.sendEmail(ctx, buyerEmail, EmailTemplate.TicketPurchased, {
      eventName,
      ticketDetails,
    });
  }
}
