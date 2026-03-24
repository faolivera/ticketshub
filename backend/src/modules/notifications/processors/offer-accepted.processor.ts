import { Injectable } from '@nestjs/common';
import type { Ctx } from '../../../common/types/context';
import { formatMoney } from '../../../common/format-money';
import type { NotificationRecipient } from '../notifications.domain';
import { NotificationEventType, NotificationRecipientRole } from '../notifications.domain';
import type { OfferAcceptedContext } from '../notifications.contexts';
import type { EventProcessor } from './processor.interface';

@Injectable()
export class OfferAcceptedProcessor implements EventProcessor<OfferAcceptedContext> {
  readonly eventType = NotificationEventType.OFFER_ACCEPTED;

  async getRecipients(
    _ctx: Ctx,
    context: OfferAcceptedContext,
  ): Promise<NotificationRecipient[]> {
    return [{ userId: context.buyerId, role: NotificationRecipientRole.BUYER }];
  }

  getTemplateVariables(
    context: OfferAcceptedContext,
    recipientId: string,
    _role: NotificationRecipientRole,
  ): Record<string, string> {
    void recipientId;
    return {
      offerId: String(context.offerId ?? ''),
      listingId: String(context.listingId ?? ''),
      eventName: String(context.eventName ?? ''),
      offeredAmount: String(context.offeredAmount),
      currency: String(context.currency ?? ''),
      amountFormatted: formatMoney(context.offeredAmount, context.currency),
    };
  }
}
