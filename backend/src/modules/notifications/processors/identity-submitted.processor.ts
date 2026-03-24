import { Injectable } from '@nestjs/common';
import type { Ctx } from '../../../common/types/context';
import type { NotificationRecipient } from '../notifications.domain';
import { NotificationEventType, NotificationRecipientRole } from '../notifications.domain';
import type { IdentitySubmittedContext } from '../notifications.contexts';
import type { EventProcessor } from './processor.interface';
import { UsersService } from '../../users/users.service';

@Injectable()
export class IdentitySubmittedProcessor implements EventProcessor<IdentitySubmittedContext> {
  readonly eventType = NotificationEventType.IDENTITY_SUBMITTED;

  constructor(private readonly usersService: UsersService) {}

  async getRecipients(
    ctx: Ctx,
    context: IdentitySubmittedContext,
  ): Promise<NotificationRecipient[]> {
    void context;
    const adminIds = await this.usersService.getAdminUserIds(ctx);
    return adminIds.map((userId) => ({ userId, role: NotificationRecipientRole.ADMIN }));
  }

  getTemplateVariables(
    context: IdentitySubmittedContext,
    recipientId: string,
    _role: NotificationRecipientRole,
  ): Record<string, string> {
    void recipientId;
    return {
      userName: context.userName,
    };
  }
}
