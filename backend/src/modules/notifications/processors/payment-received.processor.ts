import { Injectable } from '@nestjs/common';
import type { Ctx } from '../../../common/types/context';
import { formatMoney } from '../../../common/format-money';
import type { NotificationRecipient } from '../notifications.domain';
import { NotificationEventType, NotificationRecipientRole } from '../notifications.domain';
import type { PaymentReceivedContext } from '../notifications.contexts';
import type { EventProcessor } from './processor.interface';

@Injectable()
export class PaymentReceivedProcessor implements EventProcessor<PaymentReceivedContext> {
  readonly eventType = NotificationEventType.PAYMENT_RECEIVED;

  async getRecipients(
    _ctx: Ctx,
    context: PaymentReceivedContext,
  ): Promise<NotificationRecipient[]> {
    return [
      { userId: context.buyerId, role: NotificationRecipientRole.BUYER },
      { userId: context.sellerId, role: NotificationRecipientRole.SELLER },
    ];
  }

  getTemplateVariables(
    context: PaymentReceivedContext,
    recipientId: string,
    role: NotificationRecipientRole,
  ): Record<string, string> {
    if (role === NotificationRecipientRole.BUYER) {
      return {
        eventName: context.eventName,
        amountFormatted: formatMoney(context.buyerPaidAmount, context.currency),
        transactionId: context.transactionId,
      };
    }

    return {
      eventName: context.eventName,
      ticketCount: String(context.ticketCount),
      amountFormatted: formatMoney(context.sellerReceivesAmount, context.currency),
      transactionId: context.transactionId,
    };
  }
}
