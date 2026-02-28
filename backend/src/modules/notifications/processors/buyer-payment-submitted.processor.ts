import { Injectable } from '@nestjs/common';
import type { Ctx } from '../../../common/types/context';
import type { NotificationRecipient } from '../notifications.domain';
import { NotificationEventType } from '../notifications.domain';
import type { BuyerPaymentSubmittedContext } from '../notifications.contexts';
import type { EventProcessor } from './processor.interface';

@Injectable()
export class BuyerPaymentSubmittedProcessor
  implements EventProcessor<BuyerPaymentSubmittedContext>
{
  readonly eventType = NotificationEventType.BUYER_PAYMENT_SUBMITTED;

  async getRecipients(
    ctx: Ctx,
    context: BuyerPaymentSubmittedContext,
  ): Promise<NotificationRecipient[]> {
    // Only the seller receives this notification
    return [{ userId: context.sellerId }];
  }

  getTemplateVariables(
    context: BuyerPaymentSubmittedContext,
    recipientId: string,
  ): Record<string, string> {
    return {
      buyerName: context.buyerName,
      eventName: context.eventName,
      amount: String(context.amount),
      currency: context.currency,
      transactionId: context.transactionId,
    };
  }
}
