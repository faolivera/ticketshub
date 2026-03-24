import { Injectable } from '@nestjs/common';
import type { Ctx } from '../../../common/types/context';
import type { NotificationRecipient } from '../notifications.domain';
import { NotificationEventType, NotificationRecipientRole } from '../notifications.domain';
import type { EventRejectedContext } from '../notifications.contexts';
import type { EventProcessor } from './processor.interface';

@Injectable()
export class EventRejectedProcessor implements EventProcessor<EventRejectedContext> {
  readonly eventType = NotificationEventType.EVENT_REJECTED;

  async getRecipients(
    ctx: Ctx,
    context: EventRejectedContext,
  ): Promise<NotificationRecipient[]> {
    // The event organizer
    return [{ userId: context.organizerId, role: NotificationRecipientRole.SELLER }];
  }

  getTemplateVariables(
    context: EventRejectedContext,
    recipientId: string,
    _role: NotificationRecipientRole,
  ): Record<string, string> {
    void recipientId;
    return {
      eventName: context.eventName,
      eventSlug: context.eventSlug,
      rejectionReason: context.rejectionReason,
    };
  }
}
