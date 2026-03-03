import { Injectable } from '@nestjs/common';
import type { Ctx } from '../../../common/types/context';
import { formatMoney } from '../../../common/format-money';
import type { NotificationRecipient } from '../notifications.domain';
import { NotificationEventType } from '../notifications.domain';
import type { OfferReceivedContext } from '../notifications.contexts';
import type { EventProcessor } from './processor.interface';

@Injectable()
export class OfferReceivedProcessor
  implements EventProcessor<OfferReceivedContext>
{
  readonly eventType = NotificationEventType.OFFER_RECEIVED;

  async getRecipients(
    _ctx: Ctx,
    context: OfferReceivedContext,
  ): Promise<NotificationRecipient[]> {
    return [{ userId: context.sellerId }];
  }

  getTemplateVariables(
    context: OfferReceivedContext,
    _recipientId: string,
  ): Record<string, string> {
    return {
      offerId: context.offerId,
      listingId: context.listingId,
      eventName: context.eventName,
      offeredAmount: String(context.offeredAmount),
      currency: context.currency,
      amountFormatted: formatMoney(context.offeredAmount, context.currency),
    };
  }
}
