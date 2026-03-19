import { BadRequestException } from '@nestjs/common';

/**
 * Exception thrown when a "ticket not received" claim is opened while the
 * transaction is not in an allowed status (PaymentReceived or TicketTransferred).
 * Frontend should display a localized message using the claimInvalidStatus i18n key.
 */
export class ClaimInvalidStatusException extends BadRequestException {
  public readonly code = 'CLAIM_INVALID_STATUS';

  constructor() {
    super({
      message:
        '"Ticket not received" can only be reported when the transaction is PaymentReceived or TicketTransferred.',
      error: 'ClaimInvalidStatus',
      code: 'CLAIM_INVALID_STATUS',
    });
  }
}
