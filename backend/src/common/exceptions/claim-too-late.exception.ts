import { BadRequestException } from '@nestjs/common';
import type { ClaimRefDateType } from './claim-too-early.exception';

/**
 * Exception thrown when the claim window has passed (too late after the reference date).
 * Frontend should display a localized message using details.maxHours and details.refDateType.
 */
export class ClaimTooLateException extends BadRequestException {
  public readonly code = 'CLAIM_TOO_LATE';
  public readonly maxHours: number;
  public readonly refDateType: ClaimRefDateType;

  constructor(maxHours: number, refDateType: ClaimRefDateType) {
    super({
      message: `Claims must be opened within ${maxHours} hours of the reference date. The deadline has passed.`,
      error: 'ClaimTooLate',
      code: 'CLAIM_TOO_LATE',
      maxHours,
      refDateType,
      retryable: false,
    });
    this.maxHours = maxHours;
    this.refDateType = refDateType;
  }
}
