import { Injectable } from '@nestjs/common';
import type { Ctx } from '../../../common/types/context';
import type { NotificationRecipient } from '../notifications.domain';
import { NotificationEventType } from '../notifications.domain';
import type { OfferRejectedContext } from '../notifications.contexts';
import type { EventProcessor } from './processor.interface';

@Injectable()
export class OfferRejectedProcessor implements EventProcessor<OfferRejectedContext> {
  readonly eventType = NotificationEventType.OFFER_REJECTED;

  async getRecipients(
    _ctx: Ctx,
    context: OfferRejectedContext,
  ): Promise<NotificationRecipient[]> {
    return [{ userId: context.buyerId }];
  }

  getTemplateVariables(
    context: OfferRejectedContext,
    _recipientId: string,
  ): Record<string, string> {
    return {
      offerId: context.offerId,
      listingId: context.listingId,
      eventName: context.eventName,
    };
  }
}
