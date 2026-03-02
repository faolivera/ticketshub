import { Injectable } from '@nestjs/common';
import type { Ctx } from '../../../common/types/context';
import { formatMoney } from '../../../common/format-money';
import type { NotificationRecipient } from '../notifications.domain';
import { NotificationEventType } from '../notifications.domain';
import type { BuyerPaymentSubmittedContext } from '../notifications.contexts';
import type { EventProcessor } from './processor.interface';
import { UsersService } from '../../users/users.service';

@Injectable()
export class BuyerPaymentSubmittedProcessor
  implements EventProcessor<BuyerPaymentSubmittedContext>
{
  readonly eventType = NotificationEventType.BUYER_PAYMENT_SUBMITTED;

  constructor(private readonly usersService: UsersService) {}

  async getRecipients(
    ctx: Ctx,
    _context: BuyerPaymentSubmittedContext,
  ): Promise<NotificationRecipient[]> {
    // All admins receive this notification (payment confirmation to review)
    const adminIds = await this.usersService.getAdminUserIds(ctx);
    return adminIds.map((userId) => ({ userId }));
  }

  getTemplateVariables(
    context: BuyerPaymentSubmittedContext,
    recipientId: string,
  ): Record<string, string> {
    return {
      buyerName: context.buyerName,
      eventName: context.eventName,
      amount: String(context.amount),
      currency: context.currency,
      amountFormatted: formatMoney(context.amount, context.currency),
      transactionId: context.transactionId,
    };
  }
}
