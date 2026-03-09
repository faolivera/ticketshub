import { Injectable } from '@nestjs/common';
import type { Ctx } from '../../../common/types/context';
import type { NotificationRecipient } from '../notifications.domain';
import { NotificationEventType } from '../notifications.domain';
import type { IdentityVerifiedContext } from '../notifications.contexts';
import type { EventProcessor } from './processor.interface';

@Injectable()
export class IdentityVerifiedProcessor implements EventProcessor<IdentityVerifiedContext> {
  readonly eventType = NotificationEventType.IDENTITY_VERIFIED;

  async getRecipients(
    ctx: Ctx,
    context: IdentityVerifiedContext,
  ): Promise<NotificationRecipient[]> {
    // The user whose identity was verified
    return [{ userId: context.userId }];
  }

  getTemplateVariables(
    context: IdentityVerifiedContext,
    recipientId: string,
  ): Record<string, string> {
    void recipientId;
    return {
      userName: context.userName,
    };
  }
}
