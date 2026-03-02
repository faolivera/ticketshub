import { Injectable } from '@nestjs/common';
import type { Ctx } from '../../../common/types/context';
import { formatMoney } from '../../../common/format-money';
import type { NotificationRecipient } from '../notifications.domain';
import { NotificationEventType } from '../notifications.domain';
import type { SellerPaymentReceivedContext } from '../notifications.contexts';
import type { EventProcessor } from './processor.interface';

@Injectable()
export class SellerPaymentReceivedProcessor
  implements EventProcessor<SellerPaymentReceivedContext>
{
  readonly eventType = NotificationEventType.SELLER_PAYMENT_RECEIVED;

  async getRecipients(
    ctx: Ctx,
    context: SellerPaymentReceivedContext,
  ): Promise<NotificationRecipient[]> {
    return [{ userId: context.sellerId }];
  }

  getTemplateVariables(
    context: SellerPaymentReceivedContext,
    recipientId: string,
  ): Record<string, string> {
    return {
      eventName: context.eventName,
      amount: String(context.amount),
      currency: context.currency,
      amountFormatted: formatMoney(context.amount, context.currency),
      transactionId: context.transactionId,
    };
  }
}
