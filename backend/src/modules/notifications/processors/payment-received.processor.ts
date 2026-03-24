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
    const amountFormatted = formatMoney(context.amount, context.currency);

    if (role === NotificationRecipientRole.BUYER) {
      return {
        eventName: context.eventName,
        amountFormatted,
        transactionId: context.transactionId,
      };
    }

    const ticketCount = String(context.ticketCount);
    return {
      eventName: context.eventName,
      ticketCount,
      amountFormatted,
      transactionId: context.transactionId,
    };
  }
}
