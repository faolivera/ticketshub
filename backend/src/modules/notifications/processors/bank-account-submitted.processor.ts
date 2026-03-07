import { Injectable } from '@nestjs/common';
import type { Ctx } from '../../../common/types/context';
import type { NotificationRecipient } from '../notifications.domain';
import { NotificationEventType } from '../notifications.domain';
import type { BankAccountSubmittedContext } from '../notifications.contexts';
import type { EventProcessor } from './processor.interface';
import { UsersService } from '../../users/users.service';

@Injectable()
export class BankAccountSubmittedProcessor
  implements EventProcessor<BankAccountSubmittedContext>
{
  readonly eventType = NotificationEventType.BANK_ACCOUNT_SUBMITTED;

  constructor(private readonly usersService: UsersService) {}

  async getRecipients(
    ctx: Ctx,
    _context: BankAccountSubmittedContext,
  ): Promise<NotificationRecipient[]> {
    const adminIds = await this.usersService.getAdminUserIds(ctx);
    return adminIds.map((userId) => ({ userId }));
  }

  getTemplateVariables(
    context: BankAccountSubmittedContext,
    _recipientId: string,
  ): Record<string, string> {
    return {
      userName: context.userName,
    };
  }
}
