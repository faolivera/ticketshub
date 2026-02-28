import { Injectable } from '@nestjs/common';
import type { Ctx } from '../../../common/types/context';
import type { NotificationRecipient } from '../notifications.domain';
import { NotificationEventType } from '../notifications.domain';
import type { DisputeResolvedContext } from '../notifications.contexts';
import type { EventProcessor } from './processor.interface';

@Injectable()
export class DisputeResolvedProcessor
  implements EventProcessor<DisputeResolvedContext>
{
  readonly eventType = NotificationEventType.DISPUTE_RESOLVED;

  async getRecipients(
    ctx: Ctx,
    context: DisputeResolvedContext,
  ): Promise<NotificationRecipient[]> {
    // Both buyer and seller receive the resolution notification
    return [{ userId: context.buyerId }, { userId: context.sellerId }];
  }

  getTemplateVariables(
    context: DisputeResolvedContext,
    recipientId: string,
  ): Record<string, string> {
    return {
      eventName: context.eventName,
      resolution: context.resolution,
      resolvedInFavorOf: context.resolvedInFavorOf,
      disputeId: context.disputeId,
      transactionId: context.transactionId,
    };
  }
}
