import { Injectable } from '@nestjs/common';
import type { Ctx } from '../../../common/types/context';
import type { NotificationRecipient } from '../notifications.domain';
import { NotificationEventType } from '../notifications.domain';
import type { OfferCancelledContext } from '../notifications.contexts';
import type { EventProcessor } from './processor.interface';

@Injectable()
export class OfferCancelledProcessor
  implements EventProcessor<OfferCancelledContext>
{
  readonly eventType = NotificationEventType.OFFER_CANCELLED;

  async getRecipients(
    _ctx: Ctx,
    context: OfferCancelledContext,
  ): Promise<NotificationRecipient[]> {
    return [{ userId: context.buyerId }];
  }

  getTemplateVariables(
    context: OfferCancelledContext,
    _recipientId: string,
  ): Record<string, string> {
    return {
      offerId: context.offerId,
      listingId: context.listingId,
      eventName: context.eventName,
      reason: context.reason ?? 'Tickets were sold or no longer available',
    };
  }
}
