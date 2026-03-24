import { Injectable } from '@nestjs/common';
import type { Ctx } from '../../../common/types/context';
import type { NotificationRecipient } from '../notifications.domain';
import { NotificationEventType, NotificationRecipientRole } from '../notifications.domain';
import type { EventApprovedContext } from '../notifications.contexts';
import type { EventProcessor } from './processor.interface';

@Injectable()
export class EventApprovedProcessor implements EventProcessor<EventApprovedContext> {
  readonly eventType = NotificationEventType.EVENT_APPROVED;

  async getRecipients(
    ctx: Ctx,
    context: EventApprovedContext,
  ): Promise<NotificationRecipient[]> {
    // The event organizer
    return [{ userId: context.organizerId, role: NotificationRecipientRole.SELLER }];
  }

  getTemplateVariables(
    context: EventApprovedContext,
    recipientId: string,
    _role: NotificationRecipientRole,
  ): Record<string, string> {
    void recipientId;
    return {
      eventName: context.eventName,
      eventSlug: context.eventSlug,
    };
  }
}
