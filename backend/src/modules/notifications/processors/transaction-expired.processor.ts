import { Injectable } from '@nestjs/common';
import type { Ctx } from '../../../common/types/context';
import type { NotificationRecipient } from '../notifications.domain';
import { NotificationEventType } from '../notifications.domain';
import type { TransactionExpiredContext } from '../notifications.contexts';
import type { EventProcessor } from './processor.interface';

@Injectable()
export class TransactionExpiredProcessor implements EventProcessor<TransactionExpiredContext> {
  readonly eventType = NotificationEventType.TRANSACTION_EXPIRED;

  async getRecipients(
    ctx: Ctx,
    context: TransactionExpiredContext,
  ): Promise<NotificationRecipient[]> {
    // Both buyer and seller receive this notification
    return [{ userId: context.buyerId }, { userId: context.sellerId }];
  }

  getTemplateVariables(
    context: TransactionExpiredContext,
    recipientId: string,
  ): Record<string, string> {
    return {
      eventName: context.eventName,
      transactionId: context.transactionId,
    };
  }
}
