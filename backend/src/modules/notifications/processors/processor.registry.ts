import { Injectable } from '@nestjs/common';
import { NotificationEventType } from '../notifications.domain';
import type { EventProcessor } from './processor.interface';
import { PaymentRequiredProcessor } from './payment-required.processor';
import { BuyerPaymentSubmittedProcessor } from './buyer-payment-submitted.processor';
import { BuyerPaymentApprovedProcessor } from './buyer-payment-approved.processor';
import { BuyerPaymentRejectedProcessor } from './buyer-payment-rejected.processor';
import { SellerPaymentReceivedProcessor } from './seller-payment-received.processor';
import { TicketTransferredProcessor } from './ticket-transferred.processor';
import { TransactionCompletedProcessor } from './transaction-completed.processor';
import { TransactionCancelledProcessor } from './transaction-cancelled.processor';
import { TransactionExpiredProcessor } from './transaction-expired.processor';
import { DisputeOpenedProcessor } from './dispute-opened.processor';
import { DisputeResolvedProcessor } from './dispute-resolved.processor';
import { IdentityVerifiedProcessor } from './identity-verified.processor';
import { IdentityRejectedProcessor } from './identity-rejected.processor';
import { EventApprovedProcessor } from './event-approved.processor';
import { EventRejectedProcessor } from './event-rejected.processor';
import { ReviewReceivedProcessor } from './review-received.processor';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyEventProcessor = EventProcessor<any>;

@Injectable()
export class ProcessorRegistry {
  private readonly processors: Map<NotificationEventType, AnyEventProcessor>;

  constructor(
    private readonly paymentRequired: PaymentRequiredProcessor,
    private readonly buyerPaymentSubmitted: BuyerPaymentSubmittedProcessor,
    private readonly buyerPaymentApproved: BuyerPaymentApprovedProcessor,
    private readonly buyerPaymentRejected: BuyerPaymentRejectedProcessor,
    private readonly sellerPaymentReceived: SellerPaymentReceivedProcessor,
    private readonly ticketTransferred: TicketTransferredProcessor,
    private readonly transactionCompleted: TransactionCompletedProcessor,
    private readonly transactionCancelled: TransactionCancelledProcessor,
    private readonly transactionExpired: TransactionExpiredProcessor,
    private readonly disputeOpened: DisputeOpenedProcessor,
    private readonly disputeResolved: DisputeResolvedProcessor,
    private readonly identityVerified: IdentityVerifiedProcessor,
    private readonly identityRejected: IdentityRejectedProcessor,
    private readonly eventApproved: EventApprovedProcessor,
    private readonly eventRejected: EventRejectedProcessor,
    private readonly reviewReceived: ReviewReceivedProcessor,
  ) {
    this.processors = new Map();
    this.registerAll();
  }

  private registerAll(): void {
    const allProcessors: AnyEventProcessor[] = [
      this.paymentRequired,
      this.buyerPaymentSubmitted,
      this.buyerPaymentApproved,
      this.buyerPaymentRejected,
      this.sellerPaymentReceived,
      this.ticketTransferred,
      this.transactionCompleted,
      this.transactionCancelled,
      this.transactionExpired,
      this.disputeOpened,
      this.disputeResolved,
      this.identityVerified,
      this.identityRejected,
      this.eventApproved,
      this.eventRejected,
      this.reviewReceived,
    ];

    for (const processor of allProcessors) {
      this.processors.set(processor.eventType, processor);
    }
  }

  /**
   * Get the processor for a given event type
   */
  getProcessor(eventType: NotificationEventType): AnyEventProcessor | undefined {
    return this.processors.get(eventType);
  }

  /**
   * Check if a processor exists for the given event type
   */
  hasProcessor(eventType: NotificationEventType): boolean {
    return this.processors.has(eventType);
  }

  /**
   * Get all registered event types
   */
  getRegisteredEventTypes(): NotificationEventType[] {
    return Array.from(this.processors.keys());
  }
}
