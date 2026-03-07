import { Injectable } from '@nestjs/common';
import type { Ctx } from '../../../common/types/context';
import type { NotificationRecipient } from '../notifications.domain';
import { NotificationEventType } from '../notifications.domain';
import type { SellerVerificationCompleteContext } from '../notifications.contexts';
import type { EventProcessor } from './processor.interface';

@Injectable()
export class SellerVerificationCompleteProcessor
  implements EventProcessor<SellerVerificationCompleteContext>
{
  readonly eventType = NotificationEventType.SELLER_VERIFICATION_COMPLETE;

  async getRecipients(
    _ctx: Ctx,
    context: SellerVerificationCompleteContext,
  ): Promise<NotificationRecipient[]> {
    return [{ userId: context.userId }];
  }

  getTemplateVariables(
    context: SellerVerificationCompleteContext,
    _recipientId: string,
  ): Record<string, string> {
    return {
      userName: context.userName,
    };
  }
}
