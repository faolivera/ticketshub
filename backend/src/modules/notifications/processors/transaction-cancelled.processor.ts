import { Injectable } from '@nestjs/common';
import type { Ctx } from '../../../common/types/context';
import type { NotificationRecipient } from '../notifications.domain';
import { NotificationEventType } from '../notifications.domain';
import type { TransactionCancelledContext } from '../notifications.contexts';
import type { EventProcessor } from './processor.interface';

@Injectable()
export class TransactionCancelledProcessor
  implements EventProcessor<TransactionCancelledContext>
{
  readonly eventType = NotificationEventType.TRANSACTION_CANCELLED;

  async getRecipients(
    ctx: Ctx,
    context: TransactionCancelledContext,
  ): Promise<NotificationRecipient[]> {
    // Both buyer and seller receive this notification
    return [{ userId: context.buyerId }, { userId: context.sellerId }];
  }

  getTemplateVariables(
    context: TransactionCancelledContext,
    recipientId: string,
  ): Record<string, string> {
    return {
      eventName: context.eventName,
      cancelledBy: context.cancelledBy,
      reason: context.reason || '',
      transactionId: context.transactionId,
    };
  }
}
