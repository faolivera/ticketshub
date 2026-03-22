import { Injectable } from '@nestjs/common';
import type { Ctx } from '../../../common/types/context';
import type { NotificationRecipient } from '../notifications.domain';
import { NotificationEventType } from '../notifications.domain';
import { CancellationReason } from '../../transactions/transactions.domain';
import type { TransactionCancelledContext } from '../notifications.contexts';
import type { EventProcessor } from './processor.interface';

const CANCELLATION_REASON_LABELS: Record<CancellationReason, string> = {
  [CancellationReason.BuyerCancelled]: 'cancelación por el comprador',
  [CancellationReason.PaymentFailed]: 'fallo en la pasarela de pago',
  [CancellationReason.PaymentTimeout]: 'vencimiento del tiempo de pago',
  [CancellationReason.AdminRejected]: 'rechazo del comprobante de pago',
  [CancellationReason.AdminReviewTimeout]: 'vencimiento del tiempo de revisión',
};

@Injectable()
export class TransactionCancelledProcessor implements EventProcessor<TransactionCancelledContext> {
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
    void recipientId;
    return {
      eventName: context.eventName,
      cancelledBy: context.cancelledBy,
      reason: CANCELLATION_REASON_LABELS[context.cancellationReason] ?? context.cancellationReason,
      transactionId: context.transactionId,
    };
  }
}
