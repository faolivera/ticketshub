import { Injectable } from '@nestjs/common';
import type { Ctx } from '../../../common/types/context';
import type { NotificationRecipient } from '../notifications.domain';
import { NotificationEventType } from '../notifications.domain';
import type { DisputeOpenedContext } from '../notifications.contexts';
import type { EventProcessor } from './processor.interface';

@Injectable()
export class DisputeOpenedProcessor implements EventProcessor<DisputeOpenedContext> {
  readonly eventType = NotificationEventType.DISPUTE_OPENED;

  async getRecipients(
    ctx: Ctx,
    context: DisputeOpenedContext,
  ): Promise<NotificationRecipient[]> {
    // Notify the counterparty (the one who didn't open the dispute)
    const counterpartyId =
      context.openedBy === 'buyer' ? context.sellerId : context.buyerId;
    return [{ userId: counterpartyId }];
  }

  getTemplateVariables(
    context: DisputeOpenedContext,
    recipientId: string,
  ): Record<string, string> {
    void recipientId;
    return {
      eventName: context.eventName,
      openedBy: context.openedBy,
      reason: context.reason,
      disputeId: context.disputeId,
      transactionId: context.transactionId,
    };
  }
}
