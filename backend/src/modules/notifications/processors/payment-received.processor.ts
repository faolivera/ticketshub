import { Injectable } from '@nestjs/common';
import type { Ctx } from '../../../common/types/context';
import { formatMoney } from '../../../common/format-money';
import type { NotificationRecipient } from '../notifications.domain';
import { NotificationEventType } from '../notifications.domain';
import type { PaymentReceivedContext } from '../notifications.contexts';
import type { EventProcessor } from './processor.interface';

@Injectable()
export class PaymentReceivedProcessor implements EventProcessor<PaymentReceivedContext> {
  readonly eventType = NotificationEventType.PAYMENT_RECEIVED;

  async getRecipients(
    _ctx: Ctx,
    context: PaymentReceivedContext,
  ): Promise<NotificationRecipient[]> {
    return [{ userId: context.buyerId }, { userId: context.sellerId }];
  }

  getTemplateVariables(
    context: PaymentReceivedContext,
    recipientId: string,
  ): Record<string, string> {
    const amountFormatted = formatMoney(context.amount, context.currency);

    if (recipientId === context.buyerId) {
      return {
        title: 'Pago confirmado',
        body: `Tu pago por las entradas de "${context.eventName}" fue confirmado. ${context.sellerName} te enviará las entradas pronto.`,
        transactionId: context.transactionId,
        amountFormatted,
      };
    }

    const entradas = context.ticketCount === 1 ? '1 entrada' : `${context.ticketCount} entradas`;
    return {
      title: 'Nuevo pago confirmado',
      body: `Recibimos el pago por ${entradas} para "${context.eventName}". ¡Transferílas lo antes posible para que el comprador pueda disfrutar del evento!`,
      transactionId: context.transactionId,
      amountFormatted,
    };
  }
}
