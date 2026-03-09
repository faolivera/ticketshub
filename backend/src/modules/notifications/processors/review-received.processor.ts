import { Injectable } from '@nestjs/common';
import type { Ctx } from '../../../common/types/context';
import type { NotificationRecipient } from '../notifications.domain';
import { NotificationEventType } from '../notifications.domain';
import type { ReviewReceivedContext } from '../notifications.contexts';
import type { EventProcessor } from './processor.interface';

@Injectable()
export class ReviewReceivedProcessor implements EventProcessor<ReviewReceivedContext> {
  readonly eventType = NotificationEventType.REVIEW_RECEIVED;

  async getRecipients(
    ctx: Ctx,
    context: ReviewReceivedContext,
  ): Promise<NotificationRecipient[]> {
    // The user who received the review
    return [{ userId: context.revieweeId }];
  }

  getTemplateVariables(
    context: ReviewReceivedContext,
    recipientId: string,
  ): Record<string, string> {
    void recipientId;
    return {
      reviewerName: context.reviewerName,
      rating: String(context.rating),
      comment: context.comment || '',
      transactionId: context.transactionId,
    };
  }
}
