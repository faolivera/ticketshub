import { Injectable } from '@nestjs/common';
import type { Ctx } from '../../../common/types/context';
import type { NotificationRecipient } from '../notifications.domain';
import { NotificationEventType, NotificationRecipientRole } from '../notifications.domain';
import type { IdentityRejectedContext } from '../notifications.contexts';
import type { EventProcessor } from './processor.interface';

@Injectable()
export class IdentityRejectedProcessor implements EventProcessor<IdentityRejectedContext> {
  readonly eventType = NotificationEventType.IDENTITY_REJECTED;

  async getRecipients(
    ctx: Ctx,
    context: IdentityRejectedContext,
  ): Promise<NotificationRecipient[]> {
    // The user whose identity was rejected
    return [{ userId: context.userId, role: NotificationRecipientRole.SELLER }];
  }

  getTemplateVariables(
    context: IdentityRejectedContext,
    recipientId: string,
    _role: NotificationRecipientRole,
  ): Record<string, string> {
    void recipientId;
    return {
      userName: context.userName,
      rejectionReason: context.rejectionReason,
    };
  }
}
