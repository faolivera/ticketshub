import { Injectable } from '@nestjs/common';
import type { Ctx } from '../../../common/types/context';
import type { NotificationRecipient } from '../notifications.domain';
import { NotificationEventType, NotificationRecipientRole } from '../notifications.domain';
import type { TicketReceivedContext } from '../notifications.contexts';
import type { EventProcessor } from './processor.interface';

@Injectable()
export class TicketReceivedProcessor implements EventProcessor<TicketReceivedContext> {
  readonly eventType = NotificationEventType.TICKET_RECEIVED;

  async getRecipients(
    _ctx: Ctx,
    context: TicketReceivedContext,
  ): Promise<NotificationRecipient[]> {
    return [{ userId: context.sellerId, role: NotificationRecipientRole.SELLER }];
  }

  getTemplateVariables(
    context: TicketReceivedContext,
    recipientId: string,
    _role: NotificationRecipientRole,
  ): Record<string, string> {
    void recipientId;
    return {
      eventName: context.eventName,
      transactionId: context.transactionId,
    };
  }
}
