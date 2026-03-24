import { Injectable } from '@nestjs/common';
import type { Ctx } from '../../../common/types/context';
import type { NotificationRecipient } from '../notifications.domain';
import { NotificationEventType, NotificationRecipientRole } from '../notifications.domain';
import type { DisputeResolvedContext } from '../notifications.contexts';
import type { EventProcessor } from './processor.interface';

@Injectable()
export class DisputeResolvedProcessor implements EventProcessor<DisputeResolvedContext> {
  readonly eventType = NotificationEventType.DISPUTE_RESOLVED;

  async getRecipients(
    ctx: Ctx,
    context: DisputeResolvedContext,
  ): Promise<NotificationRecipient[]> {
    // Both buyer and seller receive the resolution notification
    return [
      { userId: context.buyerId, role: NotificationRecipientRole.BUYER },
      { userId: context.sellerId, role: NotificationRecipientRole.SELLER },
    ];
  }

  getTemplateVariables(
    context: DisputeResolvedContext,
    recipientId: string,
    _role: NotificationRecipientRole,
  ): Record<string, string> {
    void recipientId;
    return {
      eventName: context.eventName,
      resolution: context.resolution,
      resolvedInFavorOf: context.resolvedInFavorOf,
      disputeId: context.disputeId,
      transactionId: context.transactionId,
    };
  }
}
