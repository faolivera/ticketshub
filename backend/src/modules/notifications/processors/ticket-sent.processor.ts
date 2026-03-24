import { Injectable } from '@nestjs/common';
import type { Ctx } from '../../../common/types/context';
import type { NotificationRecipient } from '../notifications.domain';
import { NotificationEventType, NotificationRecipientRole } from '../notifications.domain';
import type { TicketSentContext } from '../notifications.contexts';
import type { EventProcessor } from './processor.interface';

@Injectable()
export class TicketSentProcessor implements EventProcessor<TicketSentContext> {
  readonly eventType = NotificationEventType.TICKET_SENT;

  async getRecipients(
    _ctx: Ctx,
    context: TicketSentContext,
  ): Promise<NotificationRecipient[]> {
    return [{ userId: context.buyerId, role: NotificationRecipientRole.BUYER }];
  }

  getTemplateVariables(
    context: TicketSentContext,
    recipientId: string,
    _role: NotificationRecipientRole,
  ): Record<string, string> {
    void recipientId;
    return {
      eventName: context.eventName,
      eventDate: context.eventDate,
      venue: context.venue,
      transactionId: context.transactionId,
    };
  }
}
