export type { EventProcessor } from './processor.interface';
export { ProcessorRegistry } from './processor.registry';

import { PaymentRequiredProcessor } from './payment-required.processor';
import { BuyerPaymentSubmittedProcessor } from './buyer-payment-submitted.processor';
import { BuyerPaymentApprovedProcessor } from './buyer-payment-approved.processor';
import { BuyerPaymentRejectedProcessor } from './buyer-payment-rejected.processor';
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

export {
  PaymentRequiredProcessor,
  BuyerPaymentSubmittedProcessor,
  BuyerPaymentApprovedProcessor,
  BuyerPaymentRejectedProcessor,
  TicketTransferredProcessor,
  TransactionCompletedProcessor,
  TransactionCancelledProcessor,
  TransactionExpiredProcessor,
  DisputeOpenedProcessor,
  DisputeResolvedProcessor,
  IdentityVerifiedProcessor,
  IdentityRejectedProcessor,
  EventApprovedProcessor,
  EventRejectedProcessor,
  ReviewReceivedProcessor,
};

/**
 * All processor classes for module registration
 */
export const ALL_PROCESSORS = [
  PaymentRequiredProcessor,
  BuyerPaymentSubmittedProcessor,
  BuyerPaymentApprovedProcessor,
  BuyerPaymentRejectedProcessor,
  TicketTransferredProcessor,
  TransactionCompletedProcessor,
  TransactionCancelledProcessor,
  TransactionExpiredProcessor,
  DisputeOpenedProcessor,
  DisputeResolvedProcessor,
  IdentityVerifiedProcessor,
  IdentityRejectedProcessor,
  EventApprovedProcessor,
  EventRejectedProcessor,
  ReviewReceivedProcessor,
];
