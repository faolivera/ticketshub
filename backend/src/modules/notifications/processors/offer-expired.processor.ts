import { Injectable } from '@nestjs/common';
import type { Ctx } from '../../../common/types/context';
import type { NotificationRecipient } from '../notifications.domain';
import { NotificationEventType } from '../notifications.domain';
import type { OfferExpiredContext } from '../notifications.contexts';
import type { EventProcessor } from './processor.interface';

@Injectable()
export class OfferExpiredProcessor implements EventProcessor<OfferExpiredContext> {
  readonly eventType = NotificationEventType.OFFER_EXPIRED;

  async getRecipients(
    _ctx: Ctx,
    context: OfferExpiredContext,
  ): Promise<NotificationRecipient[]> {
    if (context.expiredReason === 'buyer_no_purchase') {
      return [{ userId: context.buyerId }, { userId: context.sellerId }];
    }
    // seller_no_response: only the buyer needs to know
    return [{ userId: context.buyerId }];
  }

  getTemplateVariables(
    context: OfferExpiredContext,
    recipientId: string,
  ): Record<string, string> {
    void recipientId;
    return {
      offerId: context.offerId,
      listingId: context.listingId,
      eventName: context.eventName,
      expiredReason: context.expiredReason,
    };
  }
}
