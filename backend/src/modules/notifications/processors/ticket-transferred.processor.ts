import { Injectable } from '@nestjs/common';
import type { Ctx } from '../../../common/types/context';
import type { NotificationRecipient } from '../notifications.domain';
import { NotificationEventType } from '../notifications.domain';
import type { TicketTransferredContext } from '../notifications.contexts';
import type { EventProcessor } from './processor.interface';

@Injectable()
export class TicketTransferredProcessor implements EventProcessor<TicketTransferredContext> {
  readonly eventType = NotificationEventType.TICKET_TRANSFERRED;

  async getRecipients(
    ctx: Ctx,
    context: TicketTransferredContext,
  ): Promise<NotificationRecipient[]> {
    // Only the buyer receives this notification
    return [{ userId: context.buyerId }];
  }

  getTemplateVariables(
    context: TicketTransferredContext,
    recipientId: string,
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
