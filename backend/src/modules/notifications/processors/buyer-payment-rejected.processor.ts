import { Injectable } from '@nestjs/common';
import type { Ctx } from '../../../common/types/context';
import type { NotificationRecipient } from '../notifications.domain';
import { NotificationEventType, NotificationRecipientRole } from '../notifications.domain';
import type { BuyerPaymentRejectedContext } from '../notifications.contexts';
import type { EventProcessor } from './processor.interface';

@Injectable()
export class BuyerPaymentRejectedProcessor implements EventProcessor<BuyerPaymentRejectedContext> {
  readonly eventType = NotificationEventType.BUYER_PAYMENT_REJECTED;

  async getRecipients(
    ctx: Ctx,
    context: BuyerPaymentRejectedContext,
  ): Promise<NotificationRecipient[]> {
    // Only the buyer receives this notification
    return [{ userId: context.buyerId, role: NotificationRecipientRole.BUYER }];
  }

  getTemplateVariables(
    context: BuyerPaymentRejectedContext,
    recipientId: string,
    _role: NotificationRecipientRole,
  ): Record<string, string> {
    void recipientId;
    return {
      sellerName: context.sellerName,
      eventName: context.eventName,
      rejectionReason: context.rejectionReason || '',
      transactionId: context.transactionId,
    };
  }
}
