export type { EventProcessor } from './processor.interface';
export { ProcessorRegistry } from './processor.registry';

import { BuyerPaymentSubmittedProcessor } from './buyer-payment-submitted.processor';
import { PaymentReceivedProcessor } from './payment-received.processor';
import { BuyerPaymentRejectedProcessor } from './buyer-payment-rejected.processor';
import { TicketTransferredProcessor } from './ticket-transferred.processor';
import { TransactionCompletedProcessor } from './transaction-completed.processor';
import { TransactionCancelledProcessor } from './transaction-cancelled.processor';
import { DisputeOpenedProcessor } from './dispute-opened.processor';
import { DisputeResolvedProcessor } from './dispute-resolved.processor';
import { IdentityVerifiedProcessor } from './identity-verified.processor';
import { IdentityRejectedProcessor } from './identity-rejected.processor';
import { IdentitySubmittedProcessor } from './identity-submitted.processor';
import { BankAccountSubmittedProcessor } from './bank-account-submitted.processor';
import { SellerVerificationCompleteProcessor } from './seller-verification-complete.processor';
import { EventApprovedProcessor } from './event-approved.processor';
import { EventRejectedProcessor } from './event-rejected.processor';
import { ReviewReceivedProcessor } from './review-received.processor';
import { OfferReceivedProcessor } from './offer-received.processor';
import { OfferAcceptedProcessor } from './offer-accepted.processor';
import { OfferRejectedProcessor } from './offer-rejected.processor';
import { OfferCancelledProcessor } from './offer-cancelled.processor';
import { OfferExpiredProcessor } from './offer-expired.processor';

export {
  BuyerPaymentSubmittedProcessor,
  PaymentReceivedProcessor,
  BuyerPaymentRejectedProcessor,
  TicketTransferredProcessor,
  TransactionCompletedProcessor,
  TransactionCancelledProcessor,
  DisputeOpenedProcessor,
  DisputeResolvedProcessor,
  IdentityVerifiedProcessor,
  IdentityRejectedProcessor,
  IdentitySubmittedProcessor,
  BankAccountSubmittedProcessor,
  SellerVerificationCompleteProcessor,
  EventApprovedProcessor,
  EventRejectedProcessor,
  ReviewReceivedProcessor,
  OfferReceivedProcessor,
  OfferAcceptedProcessor,
  OfferRejectedProcessor,
  OfferCancelledProcessor,
  OfferExpiredProcessor,
};

/**
 * All processor classes for module registration
 */
export const ALL_PROCESSORS = [
  BuyerPaymentSubmittedProcessor,
  PaymentReceivedProcessor,
  BuyerPaymentRejectedProcessor,
  TicketTransferredProcessor,
  TransactionCompletedProcessor,
  TransactionCancelledProcessor,
  DisputeOpenedProcessor,
  DisputeResolvedProcessor,
  IdentityVerifiedProcessor,
  IdentityRejectedProcessor,
  IdentitySubmittedProcessor,
  BankAccountSubmittedProcessor,
  SellerVerificationCompleteProcessor,
  EventApprovedProcessor,
  EventRejectedProcessor,
  ReviewReceivedProcessor,
  OfferReceivedProcessor,
  OfferAcceptedProcessor,
  OfferRejectedProcessor,
  OfferCancelledProcessor,
  OfferExpiredProcessor,
];
