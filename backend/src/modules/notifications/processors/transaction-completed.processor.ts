import { Injectable } from '@nestjs/common';
import type { Ctx } from '../../../common/types/context';
import { formatMoney } from '../../../common/format-money';
import type { NotificationRecipient } from '../notifications.domain';
import { NotificationEventType } from '../notifications.domain';
import type { TransactionCompletedContext } from '../notifications.contexts';
import type { EventProcessor } from './processor.interface';

@Injectable()
export class TransactionCompletedProcessor implements EventProcessor<TransactionCompletedContext> {
  readonly eventType = NotificationEventType.TRANSACTION_COMPLETED;

  async getRecipients(
    ctx: Ctx,
    context: TransactionCompletedContext,
  ): Promise<NotificationRecipient[]> {
    // Only the seller receives this notification (funds released)
    return [{ userId: context.sellerId }];
  }

  getTemplateVariables(
    context: TransactionCompletedContext,
    recipientId: string,
  ): Record<string, string> {
    void recipientId;
    return {
      eventName: context.eventName,
      amount: String(context.amount),
      currency: context.currency,
      amountFormatted: formatMoney(context.amount, context.currency),
      transactionId: context.transactionId,
    };
  }
}
