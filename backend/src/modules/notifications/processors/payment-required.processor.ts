import { Injectable } from '@nestjs/common';
import type { Ctx } from '../../../common/types/context';
import type { NotificationRecipient } from '../notifications.domain';
import { NotificationEventType } from '../notifications.domain';
import type { PaymentRequiredContext } from '../notifications.contexts';
import type { EventProcessor } from './processor.interface';

@Injectable()
export class PaymentRequiredProcessor
  implements EventProcessor<PaymentRequiredContext>
{
  readonly eventType = NotificationEventType.PAYMENT_REQUIRED;

  async getRecipients(
    ctx: Ctx,
    context: PaymentRequiredContext,
  ): Promise<NotificationRecipient[]> {
    // Only the buyer receives this notification
    return [{ userId: context.buyerId }];
  }

  getTemplateVariables(
    context: PaymentRequiredContext,
    recipientId: string,
  ): Record<string, string> {
    return {
      sellerName: context.sellerName,
      eventName: context.eventName,
      amount: String(context.amount),
      currency: context.currency,
      expiresAt: context.expiresAt,
      transactionId: context.transactionId,
    };
  }
}
