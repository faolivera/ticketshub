import { Injectable } from '@nestjs/common';
import type { Ctx } from '../../../common/types/context';
import type { NotificationRecipient } from '../notifications.domain';
import { NotificationEventType } from '../notifications.domain';
import type { IdentitySubmittedContext } from '../notifications.contexts';
import type { EventProcessor } from './processor.interface';
import { UsersService } from '../../users/users.service';

@Injectable()
export class IdentitySubmittedProcessor implements EventProcessor<IdentitySubmittedContext> {
  readonly eventType = NotificationEventType.IDENTITY_SUBMITTED;

  constructor(private readonly usersService: UsersService) {}

  async getRecipients(
    ctx: Ctx,
    _context: IdentitySubmittedContext,
  ): Promise<NotificationRecipient[]> {
    const adminIds = await this.usersService.getAdminUserIds(ctx);
    return adminIds.map((userId) => ({ userId }));
  }

  getTemplateVariables(
    context: IdentitySubmittedContext,
    _recipientId: string,
  ): Record<string, string> {
    return {
      userName: context.userName,
    };
  }
}
