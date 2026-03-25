import { Injectable } from '@nestjs/common';
import type { Ctx } from '../../../common/types/context';
import type { NotificationRecipient } from '../notifications.domain';
import { NotificationEventType, NotificationRecipientRole } from '../notifications.domain';
import { CancellationReason } from '../../transactions/transactions.domain';
import type { TransactionCancelledContext } from '../notifications.contexts';
import type { EventProcessor } from './processor.interface';

const CANCELLED_BY_LABELS: Record<'buyer' | 'seller' | 'system', string> = {
  buyer: 'Comprador',
  seller: 'Vendedor',
  system: 'TicketsHub',
};

const CANCELLATION_REASON_LABELS: Record<CancellationReason, string> = {
  [CancellationReason.BuyerCancelled]: 'Cancelado por el comprador',
  [CancellationReason.PaymentFailed]: 'No se pudo procesar el pago',
  [CancellationReason.PaymentTimeout]: 'Vencimiento del tiempo de pago',
  [CancellationReason.AdminRejected]: 'Rechazo del comprobante de pago',
  [CancellationReason.AdminReviewTimeout]: 'No se pudo validar el pago',
};

@Injectable()
export class TransactionCancelledProcessor implements EventProcessor<TransactionCancelledContext> {
  readonly eventType = NotificationEventType.TRANSACTION_CANCELLED;

  async getRecipients(
    ctx: Ctx,
    context: TransactionCancelledContext,
  ): Promise<NotificationRecipient[]> {
    // Both buyer and seller receive this notification
    return [
      { userId: context.buyerId, role: NotificationRecipientRole.BUYER },
      { userId: context.sellerId, role: NotificationRecipientRole.SELLER },
    ];
  }

  getTemplateVariables(
    context: TransactionCancelledContext,
    recipientId: string,
    _role: NotificationRecipientRole,
  ): Record<string, string> {
    void recipientId;
    return {
      eventName: context.eventName,
      cancelledBy: CANCELLED_BY_LABELS[context.cancelledBy] ?? context.cancelledBy,
      reason: CANCELLATION_REASON_LABELS[context.cancellationReason] ?? context.cancellationReason,
      transactionId: context.transactionId,
    };
  }
}
