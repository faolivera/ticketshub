import { BadRequestException } from '@nestjs/common';

/** Reference date type for claim window validation (used in i18n to pick the right label). */
export type ClaimRefDateType =
  | 'ticket_transfer'
  | 'event_date'
  | 'payment_received';

/**
 * Exception thrown when a claim is opened too soon after the reference date.
 * Frontend should display a localized message using details.minHours and details.refDateType.
 */
export class ClaimTooEarlyException extends BadRequestException {
  public readonly code = 'CLAIM_TOO_EARLY';
  public readonly minHours: number;
  public readonly refDateType: ClaimRefDateType;

  constructor(minHours: number, refDateType: ClaimRefDateType) {
    super({
      message: `Claims can only be opened at least ${minHours} hour(s) after the reference date. Please try again later.`,
      error: 'ClaimTooEarly',
      code: 'CLAIM_TOO_EARLY',
      minHours,
      refDateType,
      retryable: true,
    });
    this.minHours = minHours;
    this.refDateType = refDateType;
  }
}
