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
    // Both buyer and seller receive a notification when payment is approved
    return [
      { userId: context.buyerId },
      { userId: context.sellerId },
    ];
  }

  getTemplateVariables(
    context: BuyerPaymentApprovedContext,
    recipientId: string,
  ): Record<string, string> {
    const isBuyer = recipientId === context.buyerId;
    const transactionId = context.transactionId;
    const eventName = context.eventName;
    const sellerName = context.sellerName;

    if (isBuyer) {
      return {
        title: 'Pago aprobado',
        body: `${sellerName} aprobó tu pago para "${eventName}". El vendedor ya te transferirá la entrada.`,
        transactionId,
      };
    }
    // Seller: payment was processed (not yet available); they must transfer the ticket
    return {
      title: 'Pago procesado',
      body: `El pago del comprador para "${eventName}" fue procesado. Transferí la entrada al comprador para completar la venta.`,
      transactionId,
    };
  }
}
