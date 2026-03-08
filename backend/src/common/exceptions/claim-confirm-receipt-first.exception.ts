import { BadRequestException } from '@nestjs/common';

/**
 * Exception thrown when a "ticket did not work" claim is opened before the buyer has confirmed receipt.
 * Frontend should display a localized message using the claimConfirmReceiptFirst i18n key.
 */
export class ClaimConfirmReceiptFirstException extends BadRequestException {
  public readonly code = 'CLAIM_CONFIRM_RECEIPT_FIRST';

  constructor() {
    super({
      message:
        'You must confirm receipt of the ticket before opening a "ticket did not work" claim.',
      error: 'ClaimConfirmReceiptFirst',
      code: 'CLAIM_CONFIRM_RECEIPT_FIRST',
    });
  }
}
