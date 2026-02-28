import { Injectable } from '@nestjs/common';
import type { Ctx } from '../../../common/types/context';
import type { NotificationRecipient } from '../notifications.domain';
import { NotificationEventType } from '../notifications.domain';
import type { BuyerPaymentApprovedContext } from '../notifications.contexts';
import type { EventProcessor } from './processor.interface';

@Injectable()
export class BuyerPaymentApprovedProcessor
  implements EventProcessor<BuyerPaymentApprovedContext>
{
  readonly eventType = NotificationEventType.BUYER_PAYMENT_APPROVED;

  async getRecipients(
    ctx: Ctx,
    context: BuyerPaymentApprovedContext,
  ): Promise<NotificationRecipient[]> {
    // Only the buyer receives this notification
    return [{ userId: context.buyerId }];
  }

  getTemplateVariables(
    context: BuyerPaymentApprovedContext,
    recipientId: string,
  ): Record<string, string> {
    return {
      sellerName: context.sellerName,
      eventName: context.eventName,
      transactionId: context.transactionId,
    };
  }
}
