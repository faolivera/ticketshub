import { BadRequestException } from '@nestjs/common';

/**
 * Exception thrown when a "ticket not received" claim is opened before the ticket has been transferred.
 * Frontend should display a localized message using the claimTicketNotTransferred i18n key.
 */
export class ClaimTicketNotTransferredException extends BadRequestException {
  public readonly code = 'CLAIM_TICKET_NOT_TRANSFERRED';

  constructor() {
    super({
      message:
        'You can only open a "ticket not received" claim after the ticket has been transferred.',
      error: 'ClaimTicketNotTransferred',
      code: 'CLAIM_TICKET_NOT_TRANSFERRED',
    });
  }
}
